"""PDF MCP Client - Shared library for pdf-text-mcp server communication."""

from .http_client import MCPHTTPClient
from .utils import PDFUtils

__all__ = ["MCPHTTPClient", "PDFUtils"]
__version__ = "0.1.0"
