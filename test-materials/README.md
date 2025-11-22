# Test Materials

This directory contains PDF files used for testing across all packages in the pdf-text-mcp project.

## Files

- **GalKahanaCV2025.pdf** - Multi-page CV with complex formatting (3 pages)
- **HighLevelContentContext.pdf** - Simple single-page PDF for basic testing

## Usage

These test materials are referenced by:
- `packages/mcp-server/manual-tests/` - Integration tests for both STDIO and HTTP transports
- `packages/pdf-parser/__tests__/` - Unit tests
- `packages/pdf-parser/manual-tests/` - Manual integration tests

All tests use relative paths to reference these files from the project root.
