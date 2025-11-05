# PDF Parser

TypeScript library for PDF text and metadata extraction with native C++ bindings.

## Installation

```bash
npm install
npm run build
```

## Building

The package includes a native C++ addon that must be compiled:

```bash
# Full build (native addon + TypeScript)
npm run build

# Native addon only
npm run build:native

# TypeScript only (requires native addon already built)
npx tsc
```

**Requirements:**
- Node.js >= 18.0.0
- C++17 compiler
- CMake >= 3.15
- ICU library (for bidirectional text support)

## Usage

```typescript
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';

const extractor = new PdfExtractor({
  maxFileSize: 100 * 1024 * 1024,  // 100MB (default)
  timeout: 120000,                  // 2 minutes (default)
});

// Extract text from file
const result = await extractor.extractText('/path/to/document.pdf');
console.log(result.text);
console.log(`Pages: ${result.pageCount}`);

// Extract from buffer
const buffer = fs.readFileSync('/path/to/document.pdf');
const bufferResult = await extractor.extractTextFromBuffer(buffer);

// Get metadata
const metadata = await extractor.getMetadata('/path/to/document.pdf');
console.log(metadata.title);
console.log(metadata.author);
```

## API

### `PdfExtractor`

#### Constructor Options
```typescript
interface PdfExtractionOptions {
  maxFileSize?: number;  // Max file size in bytes (default: 100MB)
  timeout?: number;      // Timeout in milliseconds (default: 120s)
}
```

#### Methods

**`extractText(filePath: string): Promise<PdfExtractionResult>`**
Extract text from PDF file.

**`extractTextFromBuffer(buffer: Buffer): Promise<PdfExtractionResult>`**
Extract text from PDF buffer.

**`getMetadata(filePath: string): Promise<PdfMetadata>`**
Get PDF metadata from file.

**`getMetadataFromBuffer(buffer: Buffer): Promise<PdfMetadata>`**
Get PDF metadata from buffer.

#### Result Types

```typescript
interface PdfExtractionResult {
  text: string;           // Extracted text content
  pageCount: number;      // Number of pages
  processingTime: number; // Processing time in ms
  fileSize: number;       // File size in bytes
}

interface PdfMetadata {
  pageCount: number;
  version: string;
  title: string | null;
  author: string | null;
  subject: string | null;
  creator: string | null;
  producer: string | null;
  creationDate: string | null;
  modificationDate: string | null;
}
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Manual integration test
npm run test:manual
```

## Features

- ✅ Text extraction from PDF files and buffers
- ✅ Metadata extraction
- ✅ Bidirectional text support (Hebrew, Arabic, etc.)
- ✅ File size limits
- ✅ Soft timeout protection
- ✅ TypeScript type definitions

## Error Handling

All methods throw `PdfExtractionError` with error codes:
- `INVALID_FILE` - File not found or not accessible
- `FILE_TOO_LARGE` - File exceeds maxFileSize limit
- `TIMEOUT` - Operation exceeded timeout limit
- `EXTRACTION_FAILED` - PDF parsing failed
- `NATIVE_ERROR` - Native addon error

```typescript
try {
  const result = await extractor.extractText(path);
} catch (error) {
  if (error instanceof PdfExtractionError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```
