# PDF MCP Client

Shared Python library for token-efficient communication with pdf-text-mcp servers.

## Overview

This library provides direct HTTP client for MCP protocol communication, designed to **minimize LLM token usage** when extracting PDF content.

### Key Features

- **Zero-token PDF extraction**: Direct HTTP calls bypass LLM entirely
- **Base64 encoding utilities**: Automatic PDF file handling
- **MCP protocol helpers**: JSON-RPC request/response builders
- **Type-safe**: Full Python type hints
- **Async-first**: Built on httpx for async/await support

## Installation

```bash
# From within the monorepo
uv pip install -e packages/pdf-mcp-client

# Or if using pip
pip install -e packages/pdf-mcp-client
```

## Building and Testing

### Using Just (Recommended)

```bash
# Install dependencies
just install

# Run tests
just test

# Lint check
just lint

# Format code
just format

# Check formatting without modifying
just format-check

# Type check with mypy
just type-check

# Run all checks (lint + format-check + type-check + test)
just check

# Clean build artifacts
just clean

# See all available commands
just --list
```

### Using uv

```bash
# Install dependencies
uv sync --all-extras

# Run tests
uv run pytest tests

# Lint
uv run ruff check src tests

# Format
uv run black src tests

# Type check
uv run mypy src
```

## Usage

### Direct HTTP Client (Zero Tokens)

```python
from pdf_mcp_client import MCPHTTPClient

async def extract_pdf():
    async with MCPHTTPClient(
        base_url="http://localhost:3000",
        api_key="your-secret-key"  # Optional
    ) as client:
        # Extract text (0 LLM tokens used)
        text = await client.extract_text("/path/to/document.pdf")
        print(f"Extracted {len(text)} characters")

        # Extract metadata (0 LLM tokens used)
        metadata = await client.extract_metadata("/path/to/document.pdf")
        print(f"Title: {metadata.get('title')}")
        print(f"Author: {metadata.get('author')}")
```

### PDF Utilities

```python
from pdf_mcp_client import PDFUtils

# Validate and get absolute path
pdf_path = PDFUtils.validate_pdf_path("document.pdf")

# Read PDF as base64
base64_content = PDFUtils.read_pdf_as_base64("document.pdf")

# Get file size
size_bytes = PDFUtils.get_pdf_size("document.pdf")
print(f"PDF size: {size_bytes / 1024 / 1024:.2f} MB")
```

## Architecture

```
┌─────────────────────┐
│  Your Application   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  MCPHTTPClient      │
│  (0 LLM tokens)     │
└──────────┬──────────┘
           │ HTTP POST
           │ (base64 PDF)
           v
┌─────────────────────┐
│  MCP Server         │
│  (Remote)           │
└─────────────────────┘
```

## Token Efficiency

### Traditional Approach (Expensive)
```python
# ❌ Passing PDF through LLM context
prompt = f"Extract text from this PDF: {base64_pdf}"  # 50,000+ tokens!
response = llm.complete(prompt)
```

### Our Approach (Efficient)
```python
# ✅ Direct HTTP call - bypasses LLM
text = await client.extract_text("document.pdf")  # 0 tokens!
```

**Savings**: 100% reduction in token costs for PDF extraction!

## API Reference

### MCPHTTPClient

#### Constructor

```python
MCPHTTPClient(
    base_url: str,           # MCP server URL (e.g., "http://localhost:3000")
    api_key: str | None = None,  # Optional API key
    timeout: float = 30.0,   # Connection timeout (seconds)
    read_timeout: float = 60.0  # Read timeout (seconds)
)
```

#### Methods

##### `extract_text(pdf_path: str) -> str`

Extract text from PDF file.

- **Tokens used**: 0
- **Raises**: `FileNotFoundError`, `ValueError`, `httpx.HTTPError`

##### `extract_metadata(pdf_path: str) -> dict[str, Any]`

Extract metadata from PDF file.

- **Tokens used**: 0
- **Returns**: Dictionary with `title`, `author`, `subject`, `creator`, `producer`, `creationDate`, `modificationDate`
- **Raises**: `FileNotFoundError`, `ValueError`, `httpx.HTTPError`

##### `health_check() -> bool`

Check if MCP server is healthy.

- **Returns**: `True` if server is responding, `False` otherwise

### PDFUtils

Static utility class for PDF file operations.

#### Methods

##### `validate_pdf_path(pdf_path: str | Path) -> Path`

Validate PDF exists and return absolute path.

- **Raises**: `FileNotFoundError`, `ValueError`

##### `read_pdf_as_base64(pdf_path: str | Path) -> str`

Read PDF and encode as base64 string.

- **Raises**: `FileNotFoundError`, `ValueError`

##### `get_pdf_size(pdf_path: str | Path) -> int`

Get PDF file size in bytes.

- **Raises**: `FileNotFoundError`, `ValueError`

## Development

### Running Tests

```bash
cd packages/pdf-mcp-client
pytest
```

### Type Checking

```bash
mypy src/pdf_mcp_client
```

## Use Cases

This library is used by:

- **example-agent-http**: Token-efficient HTTP example
- **Custom integrations**: Any Python app needing PDF extraction without LLM costs

## License

MIT License - See LICENSE file in project root.
