"""Unit tests for PDF analyzer HTTP agent."""

import os

import pytest
from pytest_httpx import HTTPXMock

from pdf_analyzer_http.pdf_analyzer import PDFAnalyzerHTTP

# Set fake API key for testing
os.environ["GEMINI_API_KEY"] = "test_api_key_for_unit_tests"


@pytest.fixture
def temp_pdf(tmp_path):
    """Create a temporary PDF file for testing."""
    pdf_path = tmp_path / "test.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n%fake pdf content")
    return str(pdf_path)


class TestPDFAnalyzerHTTP:
    """Test cases for PDFAnalyzerHTTP class."""

    def test_init_basic(self):
        """Test basic initialization."""
        analyzer = PDFAnalyzerHTTP("http://localhost:3000")
        assert analyzer.mcp_client is not None
        assert analyzer.use_agent is True
        assert analyzer.agent is not None

    def test_init_without_agent(self):
        """Test initialization without agent."""
        analyzer = PDFAnalyzerHTTP(
            "http://localhost:3000",
            use_agent_for_summary=False,
        )
        assert analyzer.mcp_client is not None
        assert analyzer.use_agent is False
        assert analyzer.agent is None

    def test_init_with_api_key(self):
        """Test initialization with API key."""
        analyzer = PDFAnalyzerHTTP(
            "http://localhost:3000",
            api_key="secret-key",
        )
        assert analyzer.mcp_client is not None

    @pytest.mark.asyncio
    async def test_extract_text(self, httpx_mock: HTTPXMock, temp_pdf: str):
        """Test text extraction delegates to MCP client."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"content": [{"type": "text", "text": '{"text": "Sample PDF text"}'}]},
            },
        )

        async with PDFAnalyzerHTTP("http://localhost:3000") as analyzer:
            result = await analyzer.extract_text(temp_pdf)

        assert result == "Sample PDF text"

    @pytest.mark.asyncio
    async def test_extract_metadata(self, httpx_mock: HTTPXMock, temp_pdf: str):
        """Test metadata extraction delegates to MCP client."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": '{"title": "Test", "pageCount": 1}',
                        }
                    ]
                },
            },
        )

        async with PDFAnalyzerHTTP("http://localhost:3000") as analyzer:
            result = await analyzer.extract_metadata(temp_pdf)

        assert "title" in result
        assert result["title"] == "Test"

    @pytest.mark.asyncio
    async def test_summarize_pdf_without_agent(self, httpx_mock: HTTPXMock, temp_pdf: str):
        """Test PDF summarization without agent returns raw text."""
        httpx_mock.add_response(
            url="http://localhost:3000/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"content": [{"type": "text", "text": '{"text": "Extracted text"}'}]},
            },
        )

        async with PDFAnalyzerHTTP(
            "http://localhost:3000",
            use_agent_for_summary=False,
        ) as analyzer:
            result = await analyzer.summarize_pdf(temp_pdf)

        assert result == "Extracted text"

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test context manager properly closes client."""
        analyzer = PDFAnalyzerHTTP("http://localhost:3000")

        async with analyzer:
            pass

        assert analyzer.mcp_client.client.is_closed

    @pytest.mark.asyncio
    async def test_extract_text_file_not_found(self):
        """Test extract_text with nonexistent file."""
        async with PDFAnalyzerHTTP("http://localhost:3000") as analyzer:
            with pytest.raises(FileNotFoundError):
                await analyzer.extract_text("/nonexistent/file.pdf")
