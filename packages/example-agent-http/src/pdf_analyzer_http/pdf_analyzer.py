"""Token-efficient PDF analyzer using HTTP transport.

This implementation is optimized to minimize LLM token usage:
1. PDF extraction: Direct HTTP calls to MCP server (bypasses LLM)
2. Summarization: Only extracted text sent to LLM (not the full PDF)
"""

import json
from typing import Any

from pdf_mcp_client import MCPHTTPClient
from pydantic_ai import Agent


class PDFAnalyzerHTTP:
    """Token-efficient PDF analyzer for remote MCP servers.

    In HTTP mode:
    - PDF content sent directly to MCP server via HTTP (NO TOKENS)
    - Text/metadata extracted without LLM involvement (NO TOKENS)
    - Agent used only for high-level tasks like summarization (MINIMAL TOKENS)

    This approach is critical for cost efficiency when processing large PDFs.

    Usage:
        async with PDFAnalyzerHTTP(
            mcp_server_url="http://localhost:3000",
            api_key="secret",
            use_agent_for_summary=True
        ) as analyzer:
            # Extract text (0 tokens)
            text = await analyzer.extract_text("document.pdf")

            # Summarize (minimal tokens - only text sent to LLM, not PDF)
            summary = await analyzer.summarize_pdf("document.pdf")
    """

    def __init__(
        self,
        mcp_server_url: str,
        api_key: str | None = None,
        use_agent_for_summary: bool = True,
    ):
        """Initialize HTTP-based PDF analyzer.

        Args:
            mcp_server_url: URL of remote MCP server (e.g., 'http://mcp.example.com:3000')
            api_key: Optional API key for server authentication
            use_agent_for_summary: If True, use AI agent for summarization.
                                   If False, return raw extracted text.
        """
        # Create direct HTTP client for MCP
        self.mcp_client = MCPHTTPClient(
            base_url=mcp_server_url,
            api_key=api_key,
            timeout=30.0,
            read_timeout=60.0,
        )

        # Optional: Create agent for summarization only
        self.use_agent = use_agent_for_summary
        if use_agent_for_summary:
            self.agent = Agent(
                "gemini-2.5-flash",
                system_prompt=(
                    "You are a helpful PDF analysis assistant. "
                    "Provide clear, concise summaries of PDF content. "
                    "Focus on key points, main topics, and important details."
                ),
            )
        else:
            self.agent = None

    async def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF (NO TOKENS USED).

        This method:
        1. Reads PDF from local filesystem
        2. Sends base64 content directly to MCP server via HTTP
        3. Returns extracted text

        NO LLM INVOLVED - Zero token cost.

        Args:
            pdf_path: Path to local PDF file

        Returns:
            Extracted text content

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        return await self.mcp_client.extract_text(pdf_path)

    async def extract_metadata(self, pdf_path: str) -> dict[str, Any]:
        """Extract metadata from PDF (NO TOKENS USED).

        This method:
        1. Reads PDF from local filesystem
        2. Sends base64 content directly to MCP server via HTTP
        3. Returns metadata

        NO LLM INVOLVED - Zero token cost.

        Args:
            pdf_path: Path to local PDF file

        Returns:
            PDF metadata dictionary

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        return await self.mcp_client.extract_metadata(pdf_path)

    async def summarize_pdf(self, pdf_path: str) -> str:
        """Summarize PDF content.

        This method:
        1. Extracts text via direct HTTP (NO TOKENS)
        2. Sends ONLY extracted text to LLM for summarization (MINIMAL TOKENS)

        Token usage: Only the extracted text + summary prompt + response.
        The PDF binary is NEVER sent to the LLM.

        Args:
            pdf_path: Path to local PDF file

        Returns:
            Summary of PDF content

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        # Step 1: Extract text (direct HTTP - no tokens)
        text = await self.extract_text(pdf_path)

        # Step 2: Summarize (only text sent to LLM - minimal tokens)
        if self.use_agent and self.agent:
            async with self.agent:
                result = await self.agent.run(
                    f"Please provide a concise summary of this PDF content:\n\n{text}"
                )
                return result.output
        else:
            # No agent - return raw text
            return text

    async def analyze_pdf(self, pdf_path: str) -> dict[str, Any]:
        """Comprehensive PDF analysis.

        Extracts both text and metadata, then provides analysis.

        Token efficiency:
        - Text extraction: 0 tokens (direct HTTP)
        - Metadata extraction: 0 tokens (direct HTTP)
        - Summarization: ~(text_length + 100) tokens only

        Args:
            pdf_path: Path to local PDF file

        Returns:
            Dictionary with text, metadata, and optional summary

        Raises:
            FileNotFoundError: If PDF file doesn't exist
            ValueError: If file is not a PDF or MCP error occurs
            httpx.HTTPError: On HTTP communication errors
        """
        # Extract text and metadata (direct HTTP - no tokens)
        text = await self.extract_text(pdf_path)
        metadata = await self.extract_metadata(pdf_path)

        result: dict[str, Any] = {
            "text": text,
            "metadata": metadata,
            "text_length": len(text),
            "word_count": len(text.split()),
        }

        # Optional: Add AI-generated summary
        if self.use_agent and self.agent:
            async with self.agent:
                summary_result = await self.agent.run(
                    f"Provide a brief summary and key insights from this PDF content:\n\n{text}"
                )
                result["summary"] = summary_result.output

        return result

    async def close(self):
        """Close connections."""
        await self.mcp_client.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
