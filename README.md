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

## Roadmap

### Phase 5: Server Deployment & Infrastructure ✅
**Status**: Complete - [PR #6](https://github.com/galkahana/pdf-text-mcp/pull/6) merged

- ✅ Docker containerization with multi-stage builds (ARM64 support)
- ✅ Kubernetes deployment manifests with Helm chart
- ✅ HTTP/SSE transport (MCP SDK StreamableHTTPServerTransport)
- ✅ Health/readiness/liveness probes
- ✅ API key authentication (Bearer token)
- ✅ 4 environment configurations (prod, dev, minikube, default)
- ✅ Comprehensive documentation (k8s and Helm READMEs)

### Phase 5.5: Python Agent Integration Fix 🔧
**Status**: Next priority (detour before Phase 6)

Fix PydanticAI example-agent integration with MCP protocol and Gemini.

**Current Issue**:
- MCP server HTTP/SSE transport works correctly (verified with curl)
- Python agent fails with Gemini schema validation errors
- Error: `GenerateContentConfig` validation - MCP tools schema incompatible with Gemini's function calling format
- Affects both stdio and HTTP/SSE transports

**Scope**:
- Investigate PydanticAI MCP client implementation
- Debug MCP tool schema translation to Gemini format
- Test with alternative models (Claude, OpenAI) to isolate Gemini-specific issues
- Fix or document workarounds for the integration
- Ensure end-to-end PDF extraction works via remote MCP server

### Phase 6: Observability & Operations 📊
Production-ready monitoring, logging, and metrics.

- Structured JSON logging with correlation IDs
- Prometheus-compatible metrics (requests, errors, latency, PDF stats)
- Log aggregation with Loki
- Alerting integration
- Distributed tracing with OpenTelemetry

### Phase 7: True Timeout with Async Workers ⏱️
Proper cancellation and resource cleanup.

- N-API async workers for non-blocking extraction
- Worker threads for PDF processing
- True timeout cancellation (not just promise rejection)
- Immediate resource cleanup
- Thread pool management

### Phase 8: Password-Protected PDFs 🔐
Handle encrypted PDF documents.

- Password parameter in extraction APIs
- Owner and user password support
- Clear error messages for encrypted files
- Password validation and security

### Phase 9: Advanced Bidi Configuration 🔤
Configurable text direction handling.

- Optional RTL direction support
- Auto-detect text direction
- Per-document bidi settings
- API updates for bidi options

## Development

See `.claude-session-data.md` for development notes, decisions, and context.

Each package has its own README with detailed operational instructions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pdf-text-extraction](https://github.com/galkahana/pdf-text-extraction)
