"""Direct HTTP client for MCP protocol communication.

This client makes direct HTTP calls to the MCP server, bypassing the LLM
to avoid token costs when sending PDF content.
"""

import json
from typing import Any, Literal
from urllib.parse import urljoin

import httpx

from .protocol import MCPProtocol
from .utils import PDFUtils


class MCPHTTPClient:
    """Direct HTTP client for MCP server communication.

    This client is optimized for token efficiency:
    - PDF extraction: Direct HTTP calls (no LLM tokens used)
    - Content passed as base64 in HTTP body (not through LLM context)

    Usage:
        async with MCPHTTPClient("http://localhost:3000", api_key="secret") as client:
            text = await client.extract_text("/path/to/document.pdf")
            metadata = await client.extract_metadata("/path/to/document.pdf")
    """

    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        timeout: float = 30.0,
        read_timeout: float = 60.0,
    ):
        """Initialize MCP HTTP client.

        Args:
            base_url: Base URL of MCP server (e.g., 'http://localhost:3000')
            api_key: Optional API key for authentication
            timeout: Connection timeout in seconds
            read_timeout: Read timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.mcp_endpoint = urljoin(self.base_url + "/", "mcp")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        self.client = httpx.AsyncClient(
            headers=headers, timeout=httpx.Timeout(timeout, read=read_timeout)
        )
        self._request_id = 0

    def _next_request_id(self) -> int:
        """Generate next request ID."""
        self._request_id += 1
        return self._request_id

    async def _call_tool(
        self,
        tool_name: Literal["extract_text", "extract_metadata"],
        file_content_base64: str,
    ) -> dict[str, Any]:
        """Call MCP tool with base64-encoded PDF content.

        Args:
            tool_name: Name of the tool to call
            file_content_base64: Base64-encoded PDF content

        Returns:
            Tool result (parsed JSON)

        Raises:
            httpx.HTTPError: On HTTP errors
            ValueError: On MCP protocol errors
        """
        # Create JSON-RPC request
        request = MCPProtocol.create_tool_call_request(
            tool_name=tool_name,
            arguments={"fileContent": file_content_base64},
            request_id=self._next_request_id(),
        )

        # Send POST request to /mcp endpoint
        response = await self.client.post(self.mcp_endpoint, json=request)
        response.raise_for_status()

        # Parse JSON-RPC response
        rpc_response = response.json()

        # Check for JSON-RPC error
        if "error" in rpc_response:
            error = rpc_response["error"]
            raise ValueError(
                f"MCP error [{error.get('code')}]: {error.get('message')}"
            )

        # Extract result
        result = rpc_response.get("result", {})

        # Parse content (MCP returns array of content items)
        content_items = result.get("content", [])
        if not content_items:
            return {}

        # First content item should be text with JSON
        first_item = content_items[0]
        if first_item.get("type") == "text":
            return json.loads(first_item["text"])

        return {}

    async def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF file.

        This method:
        1. Reads PDF from local filesystem
        2. Base64-encodes the content
        3. Sends directly to MCP server via HTTP (NO LLM TOKENS USED)

        Args:
            pdf_path: Path to local PDF file

        Returns:
            Extracted text content

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        # Read and encode PDF (local operation - no tokens)
        base64_content = PDFUtils.read_pdf_as_base64(pdf_path)

        # Call MCP tool directly (bypasses LLM - no tokens)
        result = await self._call_tool("extract_text", base64_content)

        return result.get("text", "")

    async def extract_metadata(self, pdf_path: str) -> dict[str, Any]:
        """Extract metadata from PDF file.

        This method:
        1. Reads PDF from local filesystem
        2. Base64-encodes the content
        3. Sends directly to MCP server via HTTP (NO LLM TOKENS USED)

        Args:
            pdf_path: Path to local PDF file

        Returns:
            PDF metadata dictionary

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        # Read and encode PDF (local operation - no tokens)
        base64_content = PDFUtils.read_pdf_as_base64(pdf_path)

        # Call MCP tool directly (bypasses LLM - no tokens)
        result = await self._call_tool("extract_metadata", base64_content)

        # Result is already the metadata dictionary
        return result

    async def health_check(self) -> bool:
        """Check if server is healthy.

        Returns:
            True if server is healthy, False otherwise
        """
        try:
            response = await self.client.get(urljoin(self.base_url + "/", "health"))
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
