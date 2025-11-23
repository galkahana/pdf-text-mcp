"""Command-line interface for PDF summarizer (stdio transport)."""

import asyncio
import functools
import sys
from collections.abc import Awaitable, Callable, Coroutine
from pathlib import Path
from typing import Any

import click
from dotenv import load_dotenv

from .pdf_summarizer import PDFSummarizerStdio

# Load environment variables from .env file
load_dotenv()


def print_section(title: str, content: str) -> None:
    """Print formatted section with header and content."""
    click.echo("\n" + "=" * 80)
    click.echo(title)
    click.echo("=" * 80)
    click.echo(content)
    click.echo("=" * 80)


def run_async_command(
    coro_func: Callable[[str, str | None], Coroutine[Any, Any, None]],
) -> Callable[[str, str | None], None]:
    """Decorator to run async commands with error handling."""

    @functools.wraps(coro_func)
    def wrapper(pdf_path: str, mcp_server: str | None) -> None:
        try:
            asyncio.run(coro_func(pdf_path, mcp_server))
        except KeyboardInterrupt:
            click.echo("\nInterrupted by user", err=True)
            sys.exit(1)
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)

    return wrapper


async def run_agent_operation(
    pdf_path: str,
    mcp_server_path: str | None,
    operation: Callable[[PDFSummarizerStdio, str], Awaitable[str]],
    status_msg: str,
    result_title: str,
) -> None:
    """Run a PDF agent operation with consistent error handling and output formatting."""
    click.echo(status_msg)

    mcp_path = Path(mcp_server_path) if mcp_server_path else None
    summarizer = PDFSummarizerStdio(mcp_server_path=mcp_path)

    result = await operation(summarizer, pdf_path)
    print_section(result_title, result)


@click.group()
def cli() -> None:
    """PDF Summarizer (stdio) - AI-powered PDF analysis using PydanticAI and MCP.

    This example uses stdio transport for local MCP server communication.
    For remote HTTP servers, see example-agent-http.
    """
    pass


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option(
    "--mcp-server",
    type=click.Path(exists=True),
    help="Path to MCP server executable (default: auto-detect)",
)
@run_async_command
async def summarize(pdf_path: str, mcp_server: str | None) -> None:
    """Summarize a PDF file."""
    await run_agent_operation(
        pdf_path,
        mcp_server,
        lambda s, p: s.summarize_pdf(p),
        f"Summarizing PDF: {pdf_path}\nInitializing AI agent...\nAnalyzing PDF...",
        "SUMMARY",
    )


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option(
    "--mcp-server",
    type=click.Path(exists=True),
    help="Path to MCP server executable (default: auto-detect)",
)
@run_async_command
async def extract(pdf_path: str, mcp_server: str | None) -> None:
    """Extract text from a PDF file."""
    await run_agent_operation(
        pdf_path,
        mcp_server,
        lambda s, p: s.extract_text(p),
        f"Extracting text from PDF: {pdf_path}",
        "EXTRACTED TEXT",
    )


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option(
    "--mcp-server",
    type=click.Path(exists=True),
    help="Path to MCP server executable (default: auto-detect)",
)
@run_async_command
async def metadata(pdf_path: str, mcp_server: str | None) -> None:
    """Get metadata from a PDF file."""
    await run_agent_operation(
        pdf_path,
        mcp_server,
        lambda s, p: s.get_metadata(p),
        f"Getting metadata from PDF: {pdf_path}",
        "PDF METADATA",
    )


def main() -> None:
    """Entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
