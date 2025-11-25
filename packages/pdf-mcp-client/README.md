# PDF MCP Client

Python library for token-efficient communication with pdf-text-mcp servers.

## Overview

Direct HTTP client for MCP protocol that **bypasses LLM entirely** for PDF extraction, minimizing token costs.

## Quick Start

```bash
# Install
just install

# Run tests
just test
```

## Usage

```python
from pdf_mcp_client import MCPHTTPClient

async def extract_pdf():
    async with MCPHTTPClient(
        base_url="http://localhost:3000",
        api_key="your-secret-key"  # Optional
    ) as client:
        # Extract text (0 tokens)
        text = await client.extract_text("/path/to/document.pdf")
        print(f"Extracted {len(text)} characters")

        # Extract metadata (0 tokens)
        metadata = await client.extract_metadata("/path/to/document.pdf")
        print(f"Title: {metadata.get('title')}")
```

### PDF Utilities

```python
from pdf_mcp_client import PDFUtils

# Validate path
pdf_path = PDFUtils.validate_pdf_path("document.pdf")

# Read as base64
base64_content = PDFUtils.read_pdf_as_base64("document.pdf")

# Get size
size_bytes = PDFUtils.get_pdf_size("document.pdf")
```

## API

### MCPHTTPClient

**Constructor**: `MCPHTTPClient(base_url, api_key=None, timeout=30.0, read_timeout=60.0)`

**Methods**:
- `extract_text(pdf_path: str) -> str` - Extract text (0 tokens)
- `extract_metadata(pdf_path: str) -> dict` - Extract metadata (0 tokens)
- `health_check() -> bool` - Check server health

### PDFUtils

**Methods**:
- `validate_pdf_path(pdf_path) -> Path` - Validate and get absolute path
- `read_pdf_as_base64(pdf_path) -> str` - Read PDF as base64
- `get_pdf_size(pdf_path) -> int` - Get file size in bytes

## Commands

```bash
just install      # Install dependencies
just test         # Run tests
just lint         # Lint check
just format       # Format code
just type-check   # Type check with mypy
just check        # Run all checks
just clean        # Clean build artifacts
```

## Token Efficiency

**Traditional approach**:
```python
# ❌ 50,000+ tokens for 5MB PDF
prompt = f"Extract text from this PDF: {base64_pdf}"
response = llm.complete(prompt)
```

**Our approach**:
```python
# ✅ 0 tokens
text = await client.extract_text("document.pdf")
```

**Savings**: 100% reduction in token costs for extraction!

## Implementation Notes

**Direct HTTP**: Makes JSON-RPC calls directly to MCP server `/mcp` endpoint, completely bypassing LLM for extraction operations.

**Base64 Encoding**: Client-side operation, no network overhead until POST request.

**Async/Await**: Built on httpx for non-blocking I/O.

**Type Safety**: Full Python type hints for all methods.
