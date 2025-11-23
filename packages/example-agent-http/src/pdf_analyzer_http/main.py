"""Command-line interface for PDF analyzer (HTTP transport)."""

import asyncio
import json
import sys

import click
from dotenv import load_dotenv

from .pdf_analyzer import PDFAnalyzerHTTP

# Load environment variables from .env file
load_dotenv()


def print_section(title: str, content: str) -> None:
    """Print formatted section with header and content."""
    click.echo("\n" + "=" * 80)
    click.echo(title)
    click.echo("=" * 80)
    click.echo(content)
    click.echo("=" * 80)


@click.group()
def cli() -> None:
    """PDF Analyzer (HTTP) - Token-efficient PDF analysis for remote MCP servers.

    This example uses HTTP transport with direct HTTP calls for PDF extraction,
    minimizing LLM token usage. For local stdio servers, see example-agent-stdio.
    """
    pass


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option(
    "--mcp-url",
    type=str,
    required=True,
    envvar="MCP_SERVER_URL",
    help="URL of remote MCP server (e.g., http://localhost:3000)",
)
@click.option(
    "--api-key",
    type=str,
    envvar="MCP_API_KEY",
    help="API key for MCP server authentication",
)
def extract(pdf_path: str, mcp_url: str, api_key: str | None) -> None:
    """Extract text from PDF (direct HTTP - 0 LLM tokens).

    Examples:

        \b
        # Using command-line options
        pdf-analyzer-http extract document.pdf --mcp-url http://localhost:3000

        \b
        # Using environment variables
        export MCP_SERVER_URL=http://localhost:3000
        export MCP_API_KEY=your-secret-key
        pdf-analyzer-http extract document.pdf
    """

    async def run():
        try:
            async with PDFAnalyzerHTTP(
                mcp_url, api_key, use_agent_for_summary=False
            ) as analyzer:
                text = await analyzer.extract_text(pdf_path)
                print_section(
                    "EXTRACTED TEXT (via Direct HTTP - 0 tokens used)",
                    text if text else "(No text extracted)",
                )
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)

    asyncio.run(run())


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option("--mcp-url", type=str, required=True, envvar="MCP_SERVER_URL")
@click.option("--api-key", type=str, envvar="MCP_API_KEY")
def metadata(pdf_path: str, mcp_url: str, api_key: str | None) -> None:
    """Get PDF metadata (direct HTTP - 0 LLM tokens).

    Examples:

        \b
        pdf-analyzer-http metadata document.pdf --mcp-url http://localhost:3000
    """

    async def run():
        try:
            async with PDFAnalyzerHTTP(
                mcp_url, api_key, use_agent_for_summary=False
            ) as analyzer:
                meta = await analyzer.extract_metadata(pdf_path)
                print_section(
                    "PDF METADATA (via Direct HTTP - 0 tokens used)",
                    json.dumps(meta, indent=2, ensure_ascii=False),
                )
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)

    asyncio.run(run())


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option("--mcp-url", type=str, required=True, envvar="MCP_SERVER_URL")
@click.option("--api-key", type=str, envvar="MCP_API_KEY")
@click.option(
    "--no-agent", is_flag=True, help="Skip AI summarization, return raw text only"
)
def summarize(pdf_path: str, mcp_url: str, api_key: str | None, no_agent: bool) -> None:
    """Summarize PDF (extraction via HTTP, optional AI summary).

    Token usage breakdown:
    - PDF extraction: 0 tokens (direct HTTP)
    - Summarization: ~(text_length + 100) tokens for prompt/response

    Total: Only the extracted text is sent to LLM, not the PDF binary.

    Examples:

        \b
        # With AI summarization (minimal tokens)
        pdf-analyzer-http summarize document.pdf --mcp-url http://localhost:3000

        \b
        # Without AI (0 tokens - raw text only)
        pdf-analyzer-http summarize document.pdf --mcp-url http://localhost:3000 --no-agent
    """

    async def run():
        try:
            use_agent = not no_agent
            async with PDFAnalyzerHTTP(mcp_url, api_key, use_agent_for_summary=use_agent) as analyzer:
                summary = await analyzer.summarize_pdf(pdf_path)

                if use_agent:
                    title = (
                        "PDF SUMMARY (AI-generated from extracted text)\n"
                        "Token usage: Only extracted text sent to LLM, not PDF binary"
                    )
                else:
                    title = "PDF TEXT (direct extraction - 0 tokens)"

                print_section(title, summary)
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)

    asyncio.run(run())


@cli.command()
@click.argument("pdf_path", type=click.Path(exists=True))
@click.option("--mcp-url", type=str, required=True, envvar="MCP_SERVER_URL")
@click.option("--api-key", type=str, envvar="MCP_API_KEY")
def analyze(pdf_path: str, mcp_url: str, api_key: str | None) -> None:
    """Comprehensive PDF analysis (text + metadata + summary).

    Examples:

        \b
        pdf-analyzer-http analyze document.pdf --mcp-url http://localhost:3000
    """

    async def run():
        try:
            async with PDFAnalyzerHTTP(mcp_url, api_key, use_agent_for_summary=True) as analyzer:
                result = await analyzer.analyze_pdf(pdf_path)

                output_lines = [
                    "\nCOMPREHENSIVE PDF ANALYSIS\n",
                    "METADATA:",
                    json.dumps(result["metadata"], indent=2, ensure_ascii=False),
                    f"\nSTATS: {result['word_count']} words, {result['text_length']} characters\n",
                    "SUMMARY:",
                    result.get("summary", "N/A"),
                ]

                print_section("ANALYSIS RESULTS", "\n".join(output_lines))
        except Exception as e:
            click.echo(f"Error: {e}", err=True)
            sys.exit(1)

    asyncio.run(run())


def main() -> None:
    """Entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
