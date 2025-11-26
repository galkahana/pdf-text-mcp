# PDF Parser

TypeScript library for PDF text and metadata extraction with native C++ bindings.

## Quick Start

```bash
# Install and build
just install && just build

# Run tests
just test
```

## Usage

```typescript
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';

const extractor = new PdfExtractor({
  maxFileSize: 100 * 1024 * 1024,  // 100MB default
  timeout: 30000,                   // 30s default
});

// Extract text
const result = await extractor.extractText('/path/to/document.pdf');
console.log(result.text, result.pageCount);

// Extract from buffer
const buffer = fs.readFileSync('/path/to/document.pdf');
const bufferResult = await extractor.extractTextFromBuffer(buffer);

// Get metadata
const metadata = await extractor.getMetadata('/path/to/document.pdf');
console.log(metadata.title, metadata.author);
```

## API

### Methods

- `extractText(filePath: string): Promise<PdfExtractionResult>`
- `extractTextFromBuffer(buffer: Buffer): Promise<PdfExtractionResult>`
- `getMetadata(filePath: string): Promise<PdfMetadata>`
- `getMetadataFromBuffer(buffer: Buffer): Promise<PdfMetadata>`

### Error Codes

- `INVALID_FILE` - File not found or inaccessible
- `FILE_TOO_LARGE` - Exceeds maxFileSize limit
- `TIMEOUT` - Operation exceeded timeout
- `EXTRACTION_FAILED` - PDF parsing failed
- `NATIVE_ERROR` - Native addon error

## Build Requirements

- Node.js >= 18.0.0
- C++17 compiler
- CMake >= 3.15
- ICU library (bidirectional text support)

## Commands

```bash
just install      # Install dependencies
just build        # Build native addon + TypeScript
just rebuild      # Clean rebuild
just test         # Run tests
just lint         # Lint check
just format       # Format code
just check        # Run all checks
just clean        # Clean build artifacts
```

## Implementation Notes

**Async Workers**: All extraction operations run in N-API async workers (separate threads), non-blocking with true timeout cancellation via atomic flags.

**Bidi Support**: Bidirectional text (Hebrew, Arabic) always enabled via ICU library with automatic RTL/LTR detection using multi-signal analysis (alignment variance, content analysis, script detection).

**Stream Architecture**: Core functions work with `IByteReaderWithPosition` interface. File/buffer operations are thin wrappers that create appropriate streams.

**Timeout Behavior**: Promise rejects immediately on timeout (~1-3ms). Worker checks cancellation flag before/after extraction, not during (library limitation).
