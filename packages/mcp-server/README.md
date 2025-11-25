# PDF Text MCP Server

Model Context Protocol server for PDF text extraction.

## Quick Start

```bash
# Install and build
just install && just build

# Start server (stdio mode)
just start

# Run tests
just test
```

## Configuration

### Transport Modes

**stdio** (default) - For Claude Desktop and local agents
**http** - For remote deployment (Docker/Kubernetes)

### Environment Variables

```bash
TRANSPORT_MODE=stdio        # 'stdio' or 'http'
PORT=3000                   # HTTP port (http mode only)
HOST=0.0.0.0               # HTTP host (http mode only)
API_KEY=your-key           # Optional auth (http mode only)
MAX_FILE_SIZE=104857600    # 100MB default
TIMEOUT=30000              # 30s default
```

## Claude Desktop Setup

Add to `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pdf-text": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after changes.

## Docker Deployment

```bash
# Build and run
just docker-build
just docker-run

# Test
curl http://localhost:3000/health
```

## Kubernetes Deployment

```bash
# Minikube (development)
just minikube-all

# Production (Helm)
helm install pdf-text-mcp ./helm/pdf-text-mcp-server \
  --namespace pdf-text-mcp \
  --create-namespace \
  --set apiKey=your-secret-key
```

## Tools

### `extract_text`

Extract text from PDF file or base64 content.

**Parameters:**
- `filePath` (string, optional) - Path to PDF (stdio mode)
- `fileContent` (string, optional) - Base64 PDF (http mode)

**Returns:** `{text, pageCount, processingTime, fileSize}`

### `extract_metadata`

Extract PDF metadata.

**Parameters:**
- `filePath` (string, optional) - Path to PDF (stdio mode)
- `fileContent` (string, optional) - Base64 PDF (http mode)

**Returns:** `{pageCount, version, title, author, subject, creator, producer, creationDate, modificationDate}`

## Commands

```bash
just install      # Install dependencies
just build        # Build TypeScript
just start        # Start server
just run          # Build and start
just test         # Run tests
just lint         # Lint check
just format       # Format code
just check        # Run all checks
just clean        # Clean build artifacts
```

## HTTP Endpoints (http mode only)

- `POST /mcp` - MCP protocol (SSE streaming)
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics

## Implementation Notes

**Dual Transport**: Single codebase supports both stdio (Claude Desktop) and HTTP/SSE (remote) transports via MCP SDK.

**Parameter Differences**: stdio uses `filePath` (local filesystem), HTTP uses `fileContent` (base64) - this separation is intentional for security.

**Observability**: Structured JSON logging (Winston), Prometheus metrics, Loki/Grafana integration via Helm chart dependencies.

**Authentication**: Optional Bearer token auth for HTTP mode. No auth for stdio (parent-child process security model).

## Troubleshooting

**Server won't start**: Build pdf-parser first: `cd ../pdf-parser && just build`

**File not found**: Use absolute paths, check permissions

**Extraction fails**: Increase timeout, check if PDF encrypted, verify file size within limit

**Claude Desktop doesn't see server**: Check config JSON syntax, use absolute paths, restart Claude Desktop
