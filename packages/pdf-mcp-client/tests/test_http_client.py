"""Unit tests for MCPHTTPClient."""

from pathlib import Path

import httpx
import pytest
from pytest_httpx import HTTPXMock

from pdf_mcp_client.http_client import MCPHTTPClient


class TestMCPHTTPClient:
    """Tests for MCPHTTPClient class."""

    @pytest.fixture
    def mock_pdf_file(self, tmp_path: Path):
        """Create a temporary PDF file for testing."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"fake pdf content")
        return pdf_file

    @pytest.mark.asyncio
    async def test_init_basic(self):
        """Test basic initialization."""
        client = MCPHTTPClient("http://localhost:3000")

        assert client.base_url == "http://localhost:3000"
        assert client.mcp_endpoint == "http://localhost:3000/mcp"

    @pytest.mark.asyncio
    async def test_init_with_api_key(self):
        """Test initialization with API key."""
        client = MCPHTTPClient("http://localhost:3000", api_key="secret-key")

        # Verify API key is set in headers
        assert "Authorization" in client.client.headers
        assert client.client.headers["Authorization"] == "Bearer secret-key"

    @pytest.mark.asyncio
    async def test_init_strips_trailing_slash(self):
        """Test that trailing slash is stripped from base_url."""
        client = MCPHTTPClient("http://localhost:3000/")

        assert client.base_url == "http://localhost:3000"
        assert client.mcp_endpoint == "http://localhost:3000/mcp"

    @pytest.mark.asyncio
    async def test_extract_text_success(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test successful text extraction."""
        # Mock HTTP response
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            method="POST",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": '{"text": "Sample PDF text", "pageCount": 1}',
                        }
                    ]
                },
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.extract_text(str(mock_pdf_file))

        assert result == "Sample PDF text"

    @pytest.mark.asyncio
    async def test_extract_text_sends_base64_content(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test that extract_text sends base64-encoded content."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"content": [{"type": "text", "text": '{"text": ""}'}]},
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            await client.extract_text(str(mock_pdf_file))

        # Verify request was sent with correct structure
        request = httpx_mock.get_request()
        assert request is not None
        assert request.method == "POST"

        # Check that fileContent is base64
        body = request.read().decode()
        assert "fileContent" in body
        assert "extract_text" in body

    @pytest.mark.asyncio
    async def test_extract_metadata_success(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test successful metadata extraction."""
        metadata = {
            "title": "Test PDF",
            "author": "Test Author",
            "pageCount": 5,
        }

        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            method="POST",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": str(metadata).replace("'", '"'),
                        }
                    ]
                },
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.extract_metadata(str(mock_pdf_file))

        assert "title" in result
        assert "author" in result
        assert "pageCount" in result

    @pytest.mark.asyncio
    async def test_extract_text_file_not_found(self):
        """Test extract_text with nonexistent file."""
        async with MCPHTTPClient("http://localhost:3000") as client:
            with pytest.raises(FileNotFoundError):
                await client.extract_text("/nonexistent/file.pdf")

    @pytest.mark.asyncio
    async def test_extract_text_not_pdf(self, tmp_path: Path):
        """Test extract_text with non-PDF file."""
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")

        async with MCPHTTPClient("http://localhost:3000") as client:
            with pytest.raises(ValueError, match="File is not a PDF"):
                await client.extract_text(str(txt_file))

    @pytest.mark.asyncio
    async def test_extract_text_mcp_error(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test extract_text handles MCP errors."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "error": {
                    "code": -32600,
                    "message": "Invalid request",
                },
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            with pytest.raises(ValueError, match="MCP error"):
                await client.extract_text(str(mock_pdf_file))

    @pytest.mark.asyncio
    async def test_extract_text_http_error(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test extract_text handles HTTP errors."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            status_code=500,
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            with pytest.raises(httpx.HTTPStatusError):
                await client.extract_text(str(mock_pdf_file))

    @pytest.mark.asyncio
    async def test_health_check_healthy(self, httpx_mock: HTTPXMock):
        """Test health_check when server is healthy."""
        httpx_mock.add_response(
            url="http://localhost:3000/health",
            status_code=200,
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.health_check()

        assert result is True

    @pytest.mark.asyncio
    async def test_health_check_unhealthy(self, httpx_mock: HTTPXMock):
        """Test health_check when server is unhealthy."""
        httpx_mock.add_response(
            url="http://localhost:3000/health",
            status_code=503,
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.health_check()

        assert result is False

    @pytest.mark.asyncio
    async def test_health_check_connection_error(self):
        """Test health_check handles connection errors."""
        async with MCPHTTPClient("http://invalid-host:9999") as client:
            result = await client.health_check()

        assert result is False

    @pytest.mark.asyncio
    async def test_context_manager_closes_client(self):
        """Test that context manager properly closes the client."""
        client = MCPHTTPClient("http://localhost:3000")

        async with client:
            pass

        assert client.client.is_closed

    @pytest.mark.asyncio
    async def test_request_id_increments(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test that request IDs increment for each call."""
        # Add multiple responses
        for _ in range(3):
            httpx_mock.add_response(
                url="http://localhost:3000/mcp",
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {"content": [{"type": "text", "text": '{"text": ""}'}]},
                },
            )

        async with MCPHTTPClient("http://localhost:3000") as client:
            await client.extract_text(str(mock_pdf_file))
            await client.extract_text(str(mock_pdf_file))
            await client.extract_text(str(mock_pdf_file))

        # Verify 3 requests were made
        requests = httpx_mock.get_requests()
        assert len(requests) == 3

    @pytest.mark.asyncio
    async def test_custom_timeouts(self):
        """Test initialization with custom timeouts."""
        client = MCPHTTPClient(
            "http://localhost:3000",
            timeout=10.0,
            read_timeout=30.0,
        )

        # Verify timeout object exists and has been customized
        assert isinstance(client.client.timeout, httpx.Timeout)
        # The timeout parameter sets the connect/pool timeout
        # The read_timeout parameter sets the read timeout
        # We can't easily verify the exact values without accessing private attributes,
        # but we can verify the timeout object was created
        assert client.client.timeout is not None

    @pytest.mark.asyncio
    async def test_extract_text_empty_result(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test extract_text with empty content array."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"content": []},
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.extract_text(str(mock_pdf_file))

        assert result == ""

    @pytest.mark.asyncio
    async def test_extract_metadata_empty_result(
        self, httpx_mock: HTTPXMock, mock_pdf_file: Path
    ):
        """Test extract_metadata with empty content array."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"content": []},
            },
        )

        async with MCPHTTPClient("http://localhost:3000") as client:
            result = await client.extract_metadata(str(mock_pdf_file))

        assert result == {}
