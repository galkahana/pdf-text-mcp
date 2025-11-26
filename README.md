# PDF Text Extraction MCP

Model Context Protocol server for PDF text extraction using native C++ bindings.

## Project Structure

```
pdf-text-mcp/
├── packages/
│   ├── pdf-parser/           # Native C++ addon + TypeScript wrapper
│   ├── mcp-server/           # MCP protocol server (dual transport: stdio/HTTP)
│   ├── pdf-mcp-client/       # Shared Python client library
│   ├── example-agent-stdio/  # stdio transport example (local MCP usage)
│   └── example-agent-http/   # HTTP transport example (token-efficient remote usage)
├── .claude-session-data.md   # Claude context (development notes)
└── README.md                 # This file
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
cd packages/example-agent-stdio && just test
cd packages/example-agent-http && just test

# See available commands for a package
cd packages/<name> && just --list
```

For detailed usage instructions:
- **MCP Server setup**: See [packages/mcp-server/README.md](packages/mcp-server/README.md)
- **PDF Parser API**: See [packages/pdf-parser/README.md](packages/pdf-parser/README.md)
- **Shared Client Library**: See [packages/pdf-mcp-client/README.md](packages/pdf-mcp-client/README.md)
- **stdio Example (local)**: See [packages/example-agent-stdio/README.md](packages/example-agent-stdio/README.md)
- **HTTP Example (remote, token-efficient)**: See [packages/example-agent-http/README.md](packages/example-agent-http/README.md)

## Available Commands

**Root-level commands** (convenience):

```bash
just help           # Show all available commands
just list           # List all packages
just doctor         # Check if required tools are installed
just setup          # Install dependencies and build everything
just build-all      # Build all packages in dependency order
just test-all       # Test all packages
just lint-all       # Lint all packages
just format-all     # Format all packages
just check-all      # Run all checks (lint, format-check, type-check, test)
just clean-all      # Clean all packages
just install-all    # Install dependencies for all packages
```

**Package-level commands** (run inside package directory):

Common commands available in all packages:
- `just build` - Build the package
- `just test` - Run tests
- `just clean` - Clean build artifacts
- `just install` - Install dependencies

Additional commands per package type:
- **Node.js packages** (pdf-parser, mcp-server): `dev`, `lint`, `format`, `test-watch`, `test-coverage`, `test-manual`
- **Python packages** (pdf-mcp-client, example-agent-stdio, example-agent-http): `lint`, `format`, `type-check`, `check`, `test-verbose`, `test-coverage`
- **mcp-server only**: Docker and Kubernetes commands (see mcp-server README)

Run `just --list` inside any package to see all available commands.

## Features

- ✅ PDF text extraction (file and buffer)
- ✅ Metadata extraction (title, author, dates, etc.)
- ✅ Automatic RTL/LTR text direction detection (Hebrew, Arabic)
- ✅ MCP protocol integration (stdio + HTTP transports)
- ✅ Token-efficient HTTP client for remote servers
- ✅ File size limits and timeout protection
- ✅ True async cancellation with timeout support
- ✅ TypeScript + Python type definitions
- ✅ Comprehensive test suite (91 tests)
- ✅ Example AI agents with PydanticAI
- ✅ Docker containerization and Kubernetes deployment
- ✅ Observability (Prometheus, Grafana, Loki)

**Out of Scope:**
- ❌ Encrypted/password-protected PDFs

## Packages

### [@pdf-text-mcp/pdf-parser](packages/pdf-parser/README.md)

TypeScript library wrapping the pdf-text-extraction C++ library.

- File and buffer-based extraction
- Metadata extraction
- Native C++ performance
- Full TypeScript support

### [@pdf-text-mcp/mcp-server](packages/mcp-server/README.md)

MCP server exposing PDF extraction via JSON-RPC protocol.

- **Dual transport**: stdio (local) and HTTP (remote)
- `extract_text` and `extract_metadata` tools
- Claude Desktop integration
- Docker/Kubernetes ready with health probes
- API key authentication for HTTP mode

### [pdf-mcp-client](packages/pdf-mcp-client/README.md)

Shared Python client library for token-efficient PDF extraction.

- Direct HTTP calls to MCP server (bypasses LLM - 0 tokens)
- Base64 encoding and protocol helpers
- Async/await API with httpx
- 44 unit tests with full coverage

### [example-agent-stdio](packages/example-agent-stdio/README.md)

Example AI agent using stdio transport (local subprocess).

- PydanticAI framework with Google Gemini
- MCP client via stdio transport
- PDF summarization, text extraction, metadata analysis
- Best for: Local development, Claude Desktop integration

### [example-agent-http](packages/example-agent-http/README.md)

Token-efficient AI agent using HTTP transport (remote server).

- Direct HTTP extraction (0 tokens used)
- Only sends extracted text to LLM (not the PDF)
- 96% token cost reduction vs naive approaches
- Best for: Production, remote servers, cost optimization

## Architecture

The project consists of multiple packages working together:

```
┌─────────────────────────────────────┐
│    Claude Desktop / AI Client       │
└──────────────┬──────────────────────┘
               │ JSON-RPC over stdio/HTTP
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

### Design Patterns

**Stream-Based Core Functions (DRY Principle)**:
- Core functions work with `IByteReaderWithPosition` streams
- File/buffer operations are thin wrappers creating appropriate streams
- Single source of truth for extraction logic

**Worker Architecture**:
- `ICancellable` interface for type-safe cancellation
- `CancellableAsyncWorker<T>` template base class
- Specialized base classes: `TextExtractionBaseWorker`, `MetadataExtractionBaseWorker`
- Worker implementations in `native/workers/` folder
- Client bindings (`napi_bindings`, `pdf_extractor_addon`) at root
- N-API async workers for non-blocking extraction on separate threads
- Atomic cancellation flags for immediate resource cleanup

## Development

See `.claude-session-data.md` for development notes, decisions, and context.

Each package has its own README with detailed operational instructions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pdf-text-extraction](https://github.com/galkahana/pdf-text-extraction)
