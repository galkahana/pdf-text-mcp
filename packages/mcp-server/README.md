# PDF Text MCP Server

Model Context Protocol server for PDF text extraction.

## Installation

```bash
npm install
```

## Building and Running

### Using Just (Recommended)

```bash
# Install dependencies
just install

# Build TypeScript
just build

# Run tests
just test

# Lint check
just lint

# Auto-fix linting
just lint-fix

# Format code
just format

# Check formatting
just format-check

# Run all checks (lint + format + test)
just check

# Start the server
just start

# Build and start
just run

# Development mode (watch)
just dev

# Clean build artifacts
just clean

# See all available commands
just --list
```

### Using npm

```bash
# Build
npm run build

# Start server (stdio transport)
npm start

# Or run directly
node dist/index.js
```

The server communicates via stdio using the MCP protocol.

## Configuration

### Transport Modes

The server supports two transport modes:

1. **stdio** (default) - For local Claude Desktop integration
2. **http** - For remote deployment with HTTP/SSE transport

### Environment Variables

```bash
# Transport Configuration
TRANSPORT_MODE=stdio        # 'stdio' or 'http' (default: stdio)
PORT=3000                   # HTTP server port (default: 3000, http mode only)
HOST=0.0.0.0               # HTTP server host (default: 0.0.0.0, http mode only)
API_KEY=your-key           # Optional API key for authentication (http mode only)

# Processing Configuration
MAX_FILE_SIZE=104857600     # 100MB (default)
TIMEOUT=30000               # 30s (default)
```

### Claude Desktop Setup

Add to `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pdf-text": {
      "command": "node",
      "args": ["/absolute/path/to/pdf-text-mcp/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after making changes.

## Remote Deployment

The server can be deployed remotely using Docker and Kubernetes.

### Quick Start - Docker

```bash
# Build image
just docker-build

# Run container
just docker-run

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics
```

### Quick Start - Minikube

```bash
# Start minikube, build, and deploy
just minikube-all

# Get service URL
just minikube-url

# Test deployment
just minikube-test
```

### Production Deployment

For production Kubernetes deployments:

```bash
# Using kubectl with manifests
just k8s-apply

# Using Helm (recommended)
helm install pdf-text-mcp ./helm/pdf-text-mcp-server \
  --namespace pdf-text-mcp \
  --create-namespace \
  --set image.repository=gcr.io/your-project/pdf-text-mcp-server \
  --set image.tag=v1.0.0 \
  --set apiKey=your-secret-key
```

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for comprehensive deployment guide.

### HTTP/SSE Endpoints

When running in HTTP mode:

- **MCP Protocol**: `POST /mcp` - MCP protocol endpoint (SSE streaming)
- **Health Check**: `GET /health` - Liveness probe
- **Readiness Check**: `GET /ready` - Readiness probe
- **Metrics**: `GET /metrics` - Basic metrics (requests, errors, uptime, memory)

### API Authentication

To enable API key authentication:

```bash
# Docker
docker run -p 3000:3000 \
  -e TRANSPORT_MODE=http \
  -e API_KEY=your-secret-key \
  pdf-text-mcp-server:latest

# Kubernetes (Helm)
helm install pdf-text-mcp ./helm/pdf-text-mcp-server \
  --set apiKey=your-secret-key

# Then include in requests
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '...'
```

## Tools

### `extract_text`

Extract text content from PDF file or base64-encoded content.

**Parameters:**
- `filePath` (string, optional) - Path to PDF file (for local/stdio mode)
- `fileContent` (string, optional) - Base64-encoded PDF content (for remote/http mode)

One of `filePath` or `fileContent` must be provided.

**Returns:**
```json
{
  "text": "extracted content...",
  "pageCount": 5,
  "processingTime": 245,
  "fileSize": 102400
}
```

### `extract_metadata`

Extract metadata from PDF file or base64-encoded content.

**Parameters:**
- `filePath` (string, optional) - Path to PDF file (for local/stdio mode)
- `fileContent` (string, optional) - Base64-encoded PDF content (for remote/http mode)

One of `filePath` or `fileContent` must be provided.

**Returns:**
```json
{
  "pageCount": 5,
  "version": "1.7",
  "title": "Document Title",
  "author": "Author Name",
  "creator": "Microsoft Word",
  "producer": "Adobe PDF",
  "creationDate": "D:20221030141952+02'00'",
  "modificationDate": "D:20221030141952+02'00'"
}
```

## Testing

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Manual integration test
npm run test:manual

# With specific PDF
npm run test:manual -- /path/to/document.pdf

# All tests
npm run test:all
```

## Features

- MCP protocol compliant
- Bidirectional text support (Hebrew, Arabic, etc.)
- File size limits
- Configurable timeouts
- Comprehensive error handling

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FILE` | File not found or inaccessible |
| `FILE_TOO_LARGE` | Exceeds size limit |
| `TIMEOUT` | Operation timed out |
| `EXTRACTION_FAILED` | PDF parsing failed |
| `NATIVE_ERROR` | Native addon error |

## Troubleshooting

**Server won't start**
- Build pdf-parser first: `npm run build --workspace=@pdf-text-mcp/pdf-parser`
- Check Node.js version >= 18.0.0

**"File not found" errors**
- Use absolute paths
- Check file permissions

**Extraction fails**
- Increase timeout: `export TIMEOUT=180000`
- Check if PDF is encrypted
- Verify file size is within limit

**Claude Desktop doesn't see server**
- Check config file path and JSON syntax
- Use absolute paths in config
- Restart Claude Desktop
- Check Claude Desktop logs
