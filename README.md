# PDF Text Extraction MCP

Model Context Protocol server for PDF text extraction using native C++ bindings.

## Architecture

```
┌─────────────────────────────────────┐
│    Claude Desktop / AI Client       │
└──────────────┬──────────────────────┘
               │ JSON-RPC over stdio
┌──────────────▼──────────────────────┐
│         MCP Server                  │
│   - Protocol handling               │
│   - extract_text tool               │
│   - extract_metadata tool           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      @pdf-text-mcp/pdf-parser       │
│   - TypeScript API                  │
│   - Native addon loading            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   pdf-text-extraction (C++)         │
│   - PDF parsing                     │
│   - Text extraction with ICU bidi   │
└─────────────────────────────────────┘
```

## Project Structure

```
pdf-text-mcp/
├── packages/
│   ├── pdf-parser/      # Native C++ addon + TypeScript wrapper
│   └── mcp-server/      # MCP protocol server
├── .claude-session-data.md  # Claude context (development notes)
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- C++17 compiler
- CMake >= 3.15
- ICU library

### Installation

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Run tests
npm test
```

For detailed usage instructions:
- **MCP Server setup**: See [packages/mcp-server/README.md](packages/mcp-server/README.md)
- **PDF Parser API**: See [packages/pdf-parser/README.md](packages/pdf-parser/README.md)

## Available Commands

```bash
# Build all packages
npm run build

# Test all packages
npm test

# Build specific package
npm run build --workspace=@pdf-text-mcp/pdf-parser
npm run build --workspace=@pdf-text-mcp/mcp-server

# Test specific package
npm test --workspace=@pdf-text-mcp/pdf-parser
npm test --workspace=@pdf-text-mcp/mcp-server
```

## Features

- ✅ PDF text extraction (file and buffer)
- ✅ Metadata extraction (title, author, dates, etc.)
- ✅ Bidirectional text support (Hebrew, Arabic) - always enabled
- ✅ MCP protocol integration
- ✅ File size limits
- ✅ Timeout protection (soft timeout)
- ✅ TypeScript type definitions
- ✅ Comprehensive test suite

## Packages

### [@pdf-text-mcp/pdf-parser](packages/pdf-parser/README.md)

TypeScript library wrapping the pdf-text-extraction C++ library.

- File and buffer-based extraction
- Metadata extraction
- Native C++ performance
- Full TypeScript support

### [@pdf-text-mcp/mcp-server](packages/mcp-server/README.md)

MCP server exposing PDF extraction via JSON-RPC protocol.

- stdio transport
- `extract_text` and `extract_metadata` tools
- Claude Desktop integration
- Environment-based configuration

## Future Features

### High Priority

1. **True Timeout with Async Workers**
   - N-API async workers for true cancellation
   - Non-blocking extraction on separate threads
   - Immediate resource cleanup on timeout

2. **Password-Protected PDF Support**
   - Owner and user password handling
   - Password parameter in extraction API
   - Better error messages for encrypted files

### Medium Priority

3. **Advanced Bidi Configuration**
   - Optional RTL direction support
   - Auto-detect text direction
   - Per-document bidi settings

4. **Streaming API**
   - Page-by-page extraction
   - Reduced memory for large PDFs
   - AsyncGenerator interface

5. **Bidi Integration Test**
   - Test PDF with Hebrew/Arabic text
   - Verify text ordering correctness
   - Runtime ICU validation

### Lower Priority

6. **Performance Metrics**
   - Detailed performance tracking
   - Memory usage monitoring
   - Benchmark suite

## Development

See `.claude-session-data.md` for development notes, decisions, and context.

Each package has its own README with detailed operational instructions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pdf-text-extraction](https://github.com/galkahana/pdf-text-extraction)
