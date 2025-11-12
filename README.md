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
│   ├── mcp-server/      # MCP protocol server
│   └── example-agent/   # Python AI agent example (PydanticAI)
├── .claude-session-data.md  # Claude context (development notes)
└── README.md            # This file
```

## Quick Start

### Prerequisites

**Required:**
- [just](https://github.com/casey/just) - command runner (install: `cargo install just` or via package manager)
- Node.js >= 18.0.0
- C++17 compiler
- CMake >= 3.15
- ICU library

**For Python agent:**
- Python >= 3.10
- [uv](https://docs.astral.sh/uv/) - Python package manager

### Quick Setup

```bash
# Check if all required tools are installed
just doctor

# Install dependencies for all packages
just install-all

# Build all packages
just build-all

# Run tests
just test-all

# Run a quick demo
just demo
```

### Working with Individual Packages

Each package is independent with its own `Justfile`:

```bash
# Build specific package
cd packages/pdf-parser && just build
cd packages/mcp-server && just build

# Test specific package
cd packages/pdf-parser && just test
cd packages/mcp-server && just test
cd packages/example-agent && just test

# See available commands for a package
cd packages/<name> && just --list
```

For detailed usage instructions:
- **MCP Server setup**: See [packages/mcp-server/README.md](packages/mcp-server/README.md)
- **PDF Parser API**: See [packages/pdf-parser/README.md](packages/pdf-parser/README.md)
- **Example AI Agent**: See [packages/example-agent/README.md](packages/example-agent/README.md)

## Available Commands

**Root-level commands** (convenience):

```bash
just help           # Show all available commands
just list           # List all packages
just doctor         # Check if required tools are installed
just setup          # Install dependencies and build everything
just build-all      # Build all packages in dependency order
just test-all       # Test all packages
just check-all      # Run all checks (lint, format, type-check, test)
just clean-all      # Clean all packages
just install-all    # Install dependencies for all packages
just demo           # Build and run example agent demo
```

**Package-level commands** (run inside package directory):

Common commands available in all packages:
- `just build` - Build the package
- `just test` - Run tests
- `just clean` - Clean build artifacts
- `just install` - Install dependencies

Additional commands per package type:
- **Node.js packages** (pdf-parser, mcp-server): `dev`, `lint`, `format`
- **Python package** (example-agent): `lint`, `format`, `type-check`, `check`, `demo`

Run `just --list` inside any package to see all available commands.

## Features

- ✅ PDF text extraction (file and buffer)
- ✅ Metadata extraction (title, author, dates, etc.)
- ✅ Bidirectional text support (Hebrew, Arabic) - always enabled
- ✅ MCP protocol integration
- ✅ File size limits
- ✅ Timeout protection (soft timeout)
- ✅ TypeScript type definitions
- ✅ Comprehensive test suite
- ✅ Example AI agent with PydanticAI

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

### [example-agent](packages/example-agent/README.md)

Example AI agent demonstrating PDF summarization using PydanticAI.

- PydanticAI framework with Google Gemini
- MCP client integration via stdio transport
- PDF summarization, text extraction, and metadata analysis
- Command-line interface with `uv`

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
