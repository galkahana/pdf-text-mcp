# PDF Summarizer (stdio)

Example AI agent using PydanticAI with stdio transport for local MCP server.

## Overview

Demonstrates building an AI agent that connects to MCP server via stdio (subprocess) for Claude Desktop integration and local development.

## Quick Start

```bash
# Install
just install

# Set API key
export GEMINI_API_KEY=your-key

# Summarize PDF
just run summarize ../../test-materials/GalKahanaCV2025.pdf

# Extract text
just run extract ../../test-materials/GalKahanaCV2025.pdf

# Get metadata
just run metadata ../../test-materials/GalKahanaCV2025.pdf
```

## Usage

```bash
# Using just
just run summarize path/to/document.pdf
just run extract path/to/document.pdf
just run metadata path/to/document.pdf

# Or directly with uv
uv run pdf-summarizer-stdio summarize path/to/document.pdf
```

## Commands

```bash
just install      # Install dependencies
just test         # Run tests
just lint         # Lint check
just format       # Format code
just type-check   # Type check with mypy
just check        # Run all checks
just demo         # Run demo with test PDF
```

## Architecture

```
PDF Summarizer (PydanticAI)
    ↓ stdio subprocess
MCP Server (Node.js)
    ↓
Native C++ PDF Parser
```

## Environment Variables

Create `.env` file:

```bash
GEMINI_API_KEY=your-gemini-key      # Required
MAX_FILE_SIZE=104857600             # Optional: 100MB default
TIMEOUT=30000                       # Optional: 30s default
```

Get free Gemini API key: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## Programmatic Usage

```python
from pdf_summarizer_stdio import PDFSummarizerStdio

async def analyze():
    summarizer = PDFSummarizerStdio()
    async with summarizer.agent:
        result = await summarizer.summarize_pdf("document.pdf")
        print(result)
```

## Implementation Notes

**stdio Transport**: Uses `MCPServerStdio` to spawn MCP server as subprocess. Server has access to local filesystem, so uses file paths (not base64 content).

**PydanticAI**: Google Gemini 2.5 Flash model (free tier) with MCP server as toolset.

**File Paths**: All operations use absolute file paths since server is local subprocess with filesystem access.

## Troubleshooting

**MCP server not found**: Build the server first: `cd ../mcp-server && just build`

**API key issues**: Check `.env` file contains valid `GEMINI_API_KEY`

**Connection timeout**: Increase timeout in PDFSummarizerStdio constructor (default 30s)
