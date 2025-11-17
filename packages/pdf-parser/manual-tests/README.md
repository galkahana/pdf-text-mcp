# Manual Integration Tests

This directory contains manual integration tests for the PDF parser package.

## Purpose

These tests provide comprehensive manual verification of the PDF extraction functionality with real-world PDFs. They complement the automated unit tests by:

- Testing with actual PDF files (not mocks)
- Verifying actual extracted content (not just API contracts)
- Providing visual feedback during development
- Testing integration scenarios that are harder to unit test

## Running the Tests

```bash
# Run manual integration tests only
npm run test:manual

# Run all tests (unit tests + manual integration tests)
npm run test:all
```

## What Gets Tested

### Text Extraction
- ✅ Extract text from PDF files
- ✅ Extract text from buffers
- ✅ LTR (Left-to-Right) text direction
- ✅ RTL (Right-to-Left) text direction
- ✅ Multi-page documents
- ✅ Content verification (checks for specific expected text)

### Metadata Extraction
- ✅ Metadata from PDF files
- ✅ Metadata from buffers
- ✅ Unicode metadata (Hebrew characters)
- ✅ All standard PDF metadata fields

### Error Handling
- ✅ Non-existent files
- ✅ File size limits
- ✅ Buffer size limits

## Test PDFs

The tests use real PDFs from the test materials:
- `HighLevelContentContext.pdf` - Simple single-page PDF with shapes
- `GalKahanaCV2025.pdf` - Multi-page document with Unicode metadata

## Output

The tests provide colored output:
- 🟦 Blue: Section headers
- 🟨 Yellow: Test descriptions
- 🟢 Green: Passing assertions
- 🔴 Red: Failures

## When to Run

Run these tests:
- During development after making changes
- Before committing code
- When debugging extraction issues
- To verify new PDF formats work correctly

## Why Separate from Unit Tests?

1. **Speed**: Unit tests run fast in CI/CD; manual tests are for local verification
2. **Visibility**: Colored output and detailed logging help during development
3. **Flexibility**: Easy to add ad-hoc verification without cluttering unit tests
4. **Real-world testing**: Uses actual PDFs to catch issues mocks might miss

## Note on C++ Testing

Since the underlying C++ code doesn't have unit tests, these manual tests serve as critical verification that the text extraction actually works correctly. They verify:
- Text is extracted (not just that API doesn't error)
- Content is correct (not garbled or corrupted)
- Unicode handling works (metadata shows Hebrew: קורות חיים)
- Bidi algorithm produces readable output
