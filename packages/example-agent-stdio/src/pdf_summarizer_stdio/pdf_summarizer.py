"""PydanticAI agent that summarizes PDFs using MCP stdio transport."""

import os
from pathlib import Path

from pdf_mcp_client import PDFUtils
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStdio


class PDFSummarizerStdio:
    """AI agent that extracts and summarizes PDF content via MCP stdio transport.

    This example demonstrates local MCP usage:
    - MCP server runs as subprocess via stdio
    - Agent passes file paths in prompts
    - Server reads files directly from filesystem
    - Simple and efficient for local usage (Claude Desktop integration)
    """

    def __init__(self, mcp_server_path: Path | None = None):
        """Initialize the PDF summarizer agent.

        Args:
            mcp_server_path: Path to the MCP server executable (mcp-server/dist/index.js).
                           If not provided, will try to find path relative to this package.

        Raises:
            FileNotFoundError: If MCP server is not found at the specified path
        """
        # Find MCP server path
        if mcp_server_path is None:
            # Default: ../../mcp-server/dist/index.js relative to this file
            current_file = Path(__file__)
            mcp_server_path = (
                current_file.parent.parent.parent.parent
                / "mcp-server"
                / "dist"
                / "index.js"
            )

        if not mcp_server_path.exists():
            raise FileNotFoundError(
                f"MCP server not found at {mcp_server_path}. "
                f"Make sure to build the mcp-server package first with: "
                f"npm run build --workspace=@pdf-text-mcp/mcp-server"
            )

        # Initialize MCP server connection via stdio
        # Pass environment variables to the MCP server subprocess
        self.mcp_server = MCPServerStdio(
            "node",
            args=[str(mcp_server_path)],
            timeout=30,
            env=os.environ.copy(),  # Pass all env vars (MAX_FILE_SIZE, TIMEOUT, etc.)
        )

        # Create PydanticAI agent with Google Gemini
        self.agent = Agent(
            "gemini-2.5-flash",
            toolsets=[self.mcp_server],
            system_prompt=(
                "You are a helpful PDF analysis assistant. "
                "You have access to tools for extracting text and metadata from PDF files. "
                "When asked to summarize a PDF, first extract its text, then provide a clear, "
                "concise summary of the content. Include key points, main topics, and any "
                "important details. If metadata is relevant, mention it as well."
            ),
        )

    def _validate_and_resolve_path(self, pdf_path: str) -> str:
        """Validate PDF exists and return absolute path.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Absolute path to the PDF file

        Raises:
            FileNotFoundError: If the PDF file doesn't exist
            ValueError: If file is not a PDF
        """
        # Use shared library utility
        validated_path = PDFUtils.validate_pdf_path(pdf_path)
        return str(validated_path)

    async def _run_agent_with_prompt(self, prompt: str) -> str:
        """Run the agent with a given prompt.

        Args:
            prompt: The prompt to send to the agent

        Returns:
            The agent's response
        """
        async with self.agent:
            result = await self.agent.run(prompt)
            return result.output

    async def summarize_pdf(self, pdf_path: str) -> str:
        """Summarize a PDF file.

        Args:
            pdf_path: Path to the PDF file to summarize

        Returns:
            A summary of the PDF content
        """
        abs_path = self._validate_and_resolve_path(pdf_path)
        return await self._run_agent_with_prompt(
            f"Please summarize the PDF file at: {abs_path}"
        )

    async def extract_text(self, pdf_path: str) -> str:
        """Extract text from a PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            The extracted text content
        """
        abs_path = self._validate_and_resolve_path(pdf_path)
        return await self._run_agent_with_prompt(
            f"Extract all text from the PDF file at: {abs_path}"
        )

    async def get_metadata(self, pdf_path: str) -> str:
        """Get metadata from a PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            The PDF metadata
        """
        abs_path = self._validate_and_resolve_path(pdf_path)
        return await self._run_agent_with_prompt(
            f"Get the metadata from the PDF file at: {abs_path}"
        )
