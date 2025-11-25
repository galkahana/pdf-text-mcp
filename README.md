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
- ✅ Bidirectional text support (Hebrew, Arabic) - always enabled
- ✅ MCP protocol integration (stdio + HTTP transports)
- ✅ Token-efficient HTTP client for remote servers
- ✅ File size limits and timeout protection
- ✅ TypeScript + Python type definitions
- ✅ Comprehensive test suite (85+ tests, 82%+ coverage)
- ✅ Example AI agents with PydanticAI

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

## Roadmap

### Phase 5: Server Deployment & Infrastructure ✅
**Status**: Complete - [PR #6](https://github.com/galkahana/pdf-text-mcp/pull/6)

- ✅ Docker containerization with multi-stage builds (ARM64 support)
- ✅ Kubernetes deployment manifests with Helm chart
- ✅ HTTP/SSE transport (MCP SDK StreamableHTTPServerTransport)
- ✅ Health/readiness/liveness probes
- ✅ API key authentication (Bearer token)
- ✅ 4 environment configurations (prod, dev, minikube, default)

### Phase 5.5: Python Agent Integration Fix ✅
**Status**: Complete - [PR #7](https://github.com/galkahana/pdf-text-mcp/pull/7)

- ✅ Fixed Gemini schema validation errors (removed `oneOf` constraints)
- ✅ Updated test materials to GalKahanaCV2025.pdf
- ✅ All agent commands working (extract, metadata, summarize)
- ✅ Both stdio and HTTP/SSE transports functional

### Phase 5.6: Build Optimization & Cleanup ✅
**Status**: Complete - [PR #8](https://github.com/galkahana/pdf-text-mcp/pull/8)

- ✅ Updated to pdf-text-extraction v1.1.10 with encoding optimization
- ✅ Build time: 7 minutes → 2:39 (62% faster)
- ✅ Cleaned up Dockerfile (13 lines → 3 lines)
- ✅ Enabled parallel compilation
- ✅ Docker image: 301MB

### Phase 6: Observability & Operations ✅
**Status**: Complete - [PR #10](https://github.com/galkahana/pdf-text-mcp/pull/10)

- ✅ Structured JSON logging with correlation IDs (Winston)
- ✅ Prometheus-compatible metrics (requests, errors, latency, PDF stats)
- ✅ Log aggregation with Loki + Promtail
- ✅ Grafana dashboards with searchable logs and metrics visualization
- ✅ Alert rules configured in Prometheus
- ✅ Full K8s observability stack via Helm dependencies
- ✅ Working log dashboard with table view, search, and analytics

### Phase 7: True Timeout with Async Workers ✅
**Status**: Complete - PR #11

- ✅ N-API async workers for non-blocking extraction
- ✅ Worker threads for PDF processing
- ✅ True timeout cancellation (not just promise rejection)
- ✅ Immediate resource cleanup via atomic cancellation flags
- ✅ TypeScript interfaces for proper type safety
- ✅ Comprehensive test suite (40 tests pass, 11 new timeout tests)
- ✅ Verification scripts for threading and cancellation behavior
- ✅ Deployed and tested on Kubernetes (both HTTP and stdio transports)

### Phase 8: Advanced Observability (Optional) 📊
**Status**: Deferred - See [Issue #XX]

This phase has been moved to backlog as the current observability stack (Phase 6) provides sufficient operational visibility. Future enhancements could include:
- Distributed tracing with OpenTelemetry
- Custom Grafana dashboards for specific use cases
- Advanced alert configurations
- Performance profiling tools

### Phase 9: Advanced Bidi Configuration 🔤
**Status**: Next - In Planning

Configurable text direction handling for better multilingual support.

- Auto-detect text direction from PDF metadata
- Per-document bidi settings
- API updates for bidi configuration options
- Testing with mixed-direction documents

### Future Enhancements

**Password-Protected PDFs 🔐**
Handle encrypted PDF documents (planned for future).

- Password parameter in extraction APIs
- Owner and user password support
- Clear error messages for encrypted files
- Password validation and security

## Development

See `.claude-session-data.md` for development notes, decisions, and context.

Each package has its own README with detailed operational instructions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pdf-text-extraction](https://github.com/galkahana/pdf-text-extraction)
