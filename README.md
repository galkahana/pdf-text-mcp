# PDF Text Extraction MCP Service

A high-performance MCP (Model Context Protocol) service for extracting text from PDF files using the [pdf-text-extraction](https://github.com/galkahana/pdf-text-extraction) C++ library.

## Features

- **High Performance**: Native C++ bindings for fast PDF text extraction
- **Bidirectional Text Support**: Proper handling of RTL languages (Hebrew, Arabic)
- **Concurrent Processing**: Configurable worker pools for parallel PDF processing
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Production Ready**: Docker containers, Kubernetes manifests, and Helm charts
- **Monorepo Structure**: Organized workspace with shared tooling and utilities

## Project Structure

```
pdf-text-mcp/
├── packages/
│   ├── pdf-parser/           # TypeScript wrapper for pdf-text-extraction
│   ├── mcp-server/           # MCP server implementation
│   └── example-agent/        # Example Pydantic agent
├── tools/                    # Shared tooling and utilities
├── docs/                     # Documentation
├── k8s/                      # Kubernetes manifests
└── helm/                     # Helm charts
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- C++ compiler (for native bindings)
- CMake >= 3.15

### Installation

```bash
# Clone the repository
git clone https://github.com/galkahana/pdf-text-mcp.git
cd pdf-text-mcp

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Usage

#### PDF Parser (Phase 1)

```typescript
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';

const extractor = new PdfExtractor({
  enableBidi: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeout: 30000, // 30 seconds
});

// Extract text from file
const result = await extractor.extractText('/path/to/document.pdf');
console.log(result.text);
console.log(`Processed ${result.pageCount} pages in ${result.processingTime}ms`);

// Extract text from buffer
const buffer = await fs.readFile('/path/to/document.pdf');
const result = await extractor.extractTextFromBuffer(buffer);
```

#### MCP Server (Phase 2)

```bash
# Start the MCP server
npm run dev --workspace=mcp-server

# The server will be available at http://localhost:3000
```

## Development

### Available Scripts

- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build artifacts

### Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests (requires sample PDFs)
npm run test:integration
```

## Configuration

### PDF Parser Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableBidi` | boolean | `false` | Enable bidirectional text support |
| `maxFileSize` | number | `100MB` | Maximum file size in bytes |
| `timeout` | number | `30000` | Extraction timeout in milliseconds |

### MCP Server Configuration

Environment variables:

- `PORT` - Server port (default: 3000)
- `MAX_CONCURRENT_JOBS` - Maximum concurrent PDF processing jobs
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

## Deployment

### Docker

```bash
# Build Docker image
docker build -t pdf-text-mcp .

# Run container
docker run -p 3000:3000 pdf-text-mcp
```

### Kubernetes

```bash
# Deploy using Kubernetes manifests
kubectl apply -f k8s/

# Or use Helm
helm install pdf-text-mcp ./helm/pdf-text-mcp
```

## Performance

- **File Size Limit**: 100MB per PDF (configurable)
- **Concurrent Processing**: Configurable worker pool size
- **Memory Usage**: Optimized for large document processing
- **Processing Speed**: ~1-5 seconds per MB (varies by document complexity)

## Bidirectional Text Support

The service includes full support for bidirectional text (Hebrew, Arabic, etc.) when enabled:

```typescript
const extractor = new PdfExtractor({ enableBidi: true });
const result = await extractor.extractText('hebrew-document.pdf');
// Text will be in logical order (not visual order)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Architecture

This project follows a modular architecture:

1. **PDF Parser Package**: Low-level TypeScript wrapper around the C++ library
2. **MCP Server Package**: HTTP server implementing the MCP protocol
3. **Example Agent Package**: Reference implementation using the MCP service

Each package is independently testable and deployable, allowing for flexible deployment scenarios.