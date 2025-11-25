# PDF Analyzer (HTTP)

Token-efficient PDF analysis using HTTP transport for remote MCP servers.

## Overview

Production-ready example showing how to minimize LLM token costs by making direct HTTP calls to MCP server for extraction, bypassing LLM entirely.

**Token Savings**: Up to 96% reduction vs traditional approaches that send PDF through LLM context.

## Quick Start

```bash
# Terminal 1: Start MCP server
cd ../mcp-server
TRANSPORT_MODE=http PORT=3000 npm start

# Terminal 2: Run analyzer
cd ../example-agent-http
just install
export GEMINI_API_KEY=your-key

# Extract text (0 tokens)
just run extract ../../test-materials/GalKahanaCV2025.pdf --mcp-url http://localhost:3000

# Summarize (minimal tokens)
just run summarize ../../test-materials/GalKahanaCV2025.pdf --mcp-url http://localhost:3000
```

## Usage

```bash
# Extract text (0 tokens)
pdf-analyzer-http extract document.pdf --mcp-url http://localhost:3000

# Get metadata (0 tokens)
pdf-analyzer-http metadata document.pdf --mcp-url http://localhost:3000

# Summarize with AI (minimal tokens)
pdf-analyzer-http summarize document.pdf --mcp-url http://localhost:3000

# Summarize without AI (0 tokens - returns raw text)
pdf-analyzer-http summarize document.pdf --mcp-url http://localhost:3000 --no-agent

# Full analysis
pdf-analyzer-http analyze document.pdf --mcp-url http://localhost:3000
```

## Token Efficiency

### Traditional Approach (Expensive)
```python
# ❌ 50,000+ tokens for 5MB PDF
prompt = f"Summarize this PDF: {base64_pdf}"
response = llm.complete(prompt)
```

### Our Approach (Efficient)
```python
# ✅ Extract via HTTP (0 tokens) → Summarize text (2,000 tokens)
text = await http_client.extract_text("document.pdf")  # 0 tokens
summary = await agent.summarize(text)                   # ~2,000 tokens
```

### Savings

| Operation | PDF Size | Traditional | Our Approach | Savings |
|-----------|----------|-------------|--------------|---------|
| Extract | 10 MB | ~100,000 tokens | **0 tokens** | 100% |
| Summarize | 10 MB | ~102,000 tokens | **~2,000 tokens** | 98% |

**Cost Example** (100 PDFs, 5MB each, Gemini 2.5 Flash):
- Traditional: ~$5.00
- Our approach: ~$0.20
- **Savings: $4.80 (96%)**

## Commands

```bash
just install      # Install dependencies
just test         # Run tests
just lint         # Lint check
just format       # Format code
just type-check   # Type check with mypy
just check        # Run all checks
```

## Architecture

```
PDF Analyzer
  ├─> Direct HTTP (extraction) → MCP Server (0 tokens)
  └─> PydanticAI Agent (summary) → Gemini API (minimal tokens)
```

## Environment Variables

Create `.env` file:

```bash
MCP_SERVER_URL=http://localhost:3000
MCP_API_KEY=your-secret-key        # Optional
GEMINI_API_KEY=your-gemini-key     # For AI summarization
```

## Programmatic Usage

```python
from pdf_analyzer_http import PDFAnalyzerHTTP

async def main():
    async with PDFAnalyzerHTTP(
        mcp_server_url="http://localhost:3000",
        api_key="your-key",
        use_agent_for_summary=True
    ) as analyzer:
        # Extract text (0 tokens)
        text = await analyzer.extract_text("document.pdf")

        # Get metadata (0 tokens)
        metadata = await analyzer.extract_metadata("document.pdf")

        # Summarize (minimal tokens)
        summary = await analyzer.summarize_pdf("document.pdf")
```

## Implementation Notes

**Direct HTTP Client**: Uses `MCPHTTPClient` from `pdf-mcp-client` to make JSON-RPC calls directly to `/mcp` endpoint, completely bypassing LLM for extraction.

**Dual-Mode Summarization**: With agent (extract + AI summary), or without agent (extract only, 0 tokens).

**Base64 Encoding**: Client encodes PDFs locally before sending to remote server (HTTP mode uses `fileContent` parameter).

**Production Ready**: Async/await, context managers, error handling, health checks.

## Remote Deployment

```bash
# Production server
pdf-analyzer-http analyze report.pdf \
  --mcp-url https://mcp.example.com \
  --api-key prod-key-xyz
```

## Troubleshooting

**Server connection failed**: Check MCP server is running in HTTP mode: `TRANSPORT_MODE=http npm start`

**API key issues**: Set `MCP_API_KEY` in `.env` or pass `--api-key` flag

**Agent errors**: Set `GEMINI_API_KEY` for AI summarization, or use `--no-agent` flag
