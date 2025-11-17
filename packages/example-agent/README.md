# PDF Summarizer

Example AI agent using PydanticAI to analyze and summarize PDFs via the Model Context Protocol (MCP).

## Overview

This example demonstrates how to build an AI agent that:
- Connects to the `@pdf-text-mcp/mcp-server` via stdio transport
- Uses PydanticAI framework with Google Gemini
- Extracts text and metadata from PDFs using MCP tools
- Generates intelligent summaries of PDF content

## Architecture

```
+------------------------------+
|  PDF Summarizer (PydanticAI) |
|  - Agent with Gemini model   |
|  - MCPServerStdio client     |
+--------------+---------------+
               |
               | stdio (subprocess)
               v
+------------------------------+
|   @pdf-text-mcp/mcp-server   |
|   - extract_text tool        |
|   - extract_metadata tool    |
+--------------+---------------+
               |
               v
+------------------------------+
|  Native C++ PDF Parser       |
+------------------------------+
```


## Prerequisites

1. **Python 3.10+** with `uv` package manager
2. **Node.js 18+** (for MCP server)
3. **MCP server built**: Run from project root:
   ```bash
   npm run build --workspace=@pdf-text-mcp/mcp-server
   ```
4. **Google Gemini API key**: Get one from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (free tier available)

## Installation

```bash
# Navigate to example-agent directory
cd packages/example-agent

# Install dependencies with uv
uv sync

# Copy environment template
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_key_here
```

## Usage

The PDF summarizer provides three commands:

### 1. Summarize a PDF

Generate an intelligent summary of a PDF file:

```bash
uv run pdf-summarizer summarize examples/GalKahanaCV2025.pdf
```

Example output:
```
Summarizing PDF: examples/GalKahanaCV2025.pdf
Initializing AI agent...
Analyzing PDF...

================================================================================
SUMMARY
================================================================================
This is a curriculum vitae (CV) for Gal Kahana, a software engineer based in
Tel Aviv, Israel. The document includes:

Key Points:
- Professional experience spanning multiple companies
- Technical skills and expertise
- Educational background
- Contact information

Main Topics:
- Software development experience
- Technical leadership roles
- Programming languages and technologies
================================================================================
```

### 2. Extract Text

Extract all text content from a PDF:

```bash
uv run pdf-summarizer extract examples/HighLevelContentContext.pdf
```

### 3. Get Metadata

Extract metadata (title, author, dates, etc.) from a PDF:

```bash
uv run pdf-summarizer metadata examples/GalKahanaCV2025.pdf
```

### Options

All commands support the `--mcp-server` option to specify a custom MCP server path:

```bash
uv run pdf-summarizer summarize \
  --mcp-server ../../mcp-server/dist/index.js \
  examples/GalKahanaCV2025.pdf
```

## Example PDFs

The `examples/` directory contains sample PDFs:

- `GalKahanaCV2025.pdf` - Multi-page CV with Unicode metadata (Hebrew)
- `HighLevelContentContext.pdf` - Simple technical document

## How It Works

### 1. MCP Connection

The agent uses `MCPServerStdio` to spawn the MCP server as a subprocess:

```python
from pydantic_ai.mcp import MCPServerStdio

mcp_server = MCPServerStdio(
    "node",
    args=["path/to/mcp-server/dist/index.js"],
    timeout=30,
)
```

### 2. Agent Configuration

The PydanticAI agent is configured with Gemini and the MCP server as a toolset:

```python
from pydantic_ai import Agent

agent = Agent(
    "gemini-2.5-flash",
    toolsets=[mcp_server],
    system_prompt="You are a helpful PDF analysis assistant..."
)
```

### 3. Workflow

When you ask the agent to summarize a PDF:

1. Agent receives your prompt with the PDF path
2. Agent decides to call the `extract_text` MCP tool
3. MCP server extracts text using the native C++ parser
4. Agent receives the extracted text
5. Agent generates a summary using Gemini's language model
6. Summary is returned to you

## Development

### Using Just (Recommended)

The project uses [just](https://github.com/casey/just) for common development tasks:

```bash
# Install dependencies
just install

# Run tests
just test

# Run tests in verbose mode
just test-verbose

# Run tests with coverage
just test-coverage

# Lint check
just lint

# Auto-fix linting issues
just lint-fix

# Format code
just format

# Check formatting
just format-check

# Type check
just type-check

# Run all checks (lint + format-check + type-check + test)
just check

# Clean artifacts
just clean

# Run demo
just demo

# Run specific command (summarize, extract, metadata)
just run summarize examples/GalKahanaCV2025.pdf

# See all available commands
just --list
```

### Using uv directly

```bash
# Run linter (ruff)
uv run ruff check src tests

# Auto-fix linting issues
uv run ruff check --fix src tests

# Format code (black)
uv run black src tests

# Check formatting without modifying files
uv run black --check src tests

# Type checking (mypy)
uv run mypy src

# Run tests
uv run pytest tests

# Run all checks
uv run ruff check src tests && \
uv run black --check src tests && \
uv run mypy src && \
uv run pytest tests
```

### Project Structure

```
example-agent/
  src/
    pdf_summarizer/
      __init__.py         # Package initialization
      pdf_summarizer.py   # PDFSummarizer class
      main.py             # CLI commands
  examples/               # Sample PDFs
  .env.example            # Environment template
  pyproject.toml          # Project config
  README.md               # This file
```
### Running from Source

```bash
# Install in development mode
uv sync

# Run commands
uv run pdf-summarizer summarize examples/GalKahanaCV2025.pdf
```

### Extending the Agent

You can extend the `PDFSummarizer` class to add more functionality:

```python
from pdf_summarizer import PDFSummarizer

async def custom_analysis():
    summarizer = PDFSummarizer()

    # Custom prompt
    async with summarizer.agent:
        result = await summarizer.agent.run(
            "Extract all dates mentioned in the PDF at examples/document.pdf"
        )
        print(result.output)
```

## Environment Variables

Create a `.env` file with:

```bash
# Required: Google Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: MCP server configuration
MAX_FILE_SIZE=104857600  # 100MB (default)
TIMEOUT=30000            # 30s (default)
```

## Troubleshooting

### MCP Server Not Found

If you get `MCP server not found`, make sure to build the server first:

```bash
cd ../../  # Go to project root
npm run build --workspace=@pdf-text-mcp/mcp-server
```

### API Key Issues

Ensure your `.env` file contains a valid Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Connection Timeout

If the MCP server times out, try increasing the timeout:

```python
mcp_server = MCPServerStdio(
    "node",
    args=[str(mcp_server_path)],
    timeout=60,  # Increase to 60 seconds
)
```

## Learn More

- **PydanticAI**: [ai.pydantic.dev](https://ai.pydantic.dev/)
- **MCP Specification**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- **Google Gemini**: [ai.google.dev](https://ai.google.dev/)
- **PDF Parser Package**: [../pdf-parser/README.md](../pdf-parser/README.md)
- **MCP Server Package**: [../mcp-server/README.md](../mcp-server/README.md)

## License

MIT License - see [../../LICENSE](../../LICENSE) file for details.
