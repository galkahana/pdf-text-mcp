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

Environment variables (all optional):

```bash
MAX_FILE_SIZE=104857600  # 100MB (default)
TIMEOUT=120000           # 120s (default)
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

## Tools

### `extract_text`

Extract text content from PDF file.

**Parameters:**
- `filePath` (string) - Path to PDF file

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

Extract metadata from PDF file.

**Parameters:**
- `filePath` (string) - Path to PDF file

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
