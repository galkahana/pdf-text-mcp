# Manual Tests

This directory contains manual test scripts for the PDF parser package. These complement automated Jest tests by providing detailed verification, debugging tools, and feature-specific testing.

## Available Tests

### 1. **integration-test.js** - Comprehensive Integration Test
**Purpose**: Full integration testing of all PDF extraction features
**When to run**:
- ✅ **Always run before committing/merging** - this is your comprehensive verification
- After any changes to the package
- When debugging extraction issues
- To verify new PDF formats work correctly

**What it tests**:
- Text extraction from files and buffers
- Metadata extraction from files and buffers
- LTR/RTL text direction detection
- Multi-page documents
- Content verification (checks for specific expected text)
- Unicode handling (Hebrew metadata)
- Error handling (non-existent files, size limits)

**How to run**:
```bash
npm run test:manual          # Run just this integration test
npm run test:all             # Run all Jest tests + this integration test
node manual-tests/integration-test.js  # Direct execution
```

**Output**: Colored output with ✅/❌ indicators for each test case

---

### 2. **verify-threading.js** - Thread Pool Verification
**Purpose**: Verify that multiple PDF extractions run in parallel using N-API thread pool
**When to run**:
- After changes to async worker implementation
- When investigating performance issues
- To verify parallel processing works correctly

**What it tests**:
- Concurrent PDF extraction (3 PDFs at once)
- Thread pool utilization
- Async worker implementation
- No blocking of Node.js event loop

**How to run**:
```bash
node manual-tests/verify-threading.js
```

**Expected output**:
```
Processing PDFs concurrently...
✓ Concurrent extraction completed
Time taken: ~100ms (should be much less than sequential ~300ms)
```

**Related**: See Phase 6 documentation for threading architecture details

---

### 3. **verify-native-cancellation.js** - Cancellation Verification
**Purpose**: Verify that long-running PDF extractions can be cancelled mid-operation
**When to run**:
- After changes to cancellation/timeout implementation
- When debugging timeout issues
- To verify worker cleanup works correctly

**What it tests**:
- Timeout mechanism triggers correctly
- Native C++ workers respond to cancellation
- Proper error handling on timeout
- Worker thread cleanup

**How to run**:
```bash
node manual-tests/verify-native-cancellation.js
```

**Expected output**:
```
Testing timeout/cancellation...
✓ Timeout correctly cancelled extraction
Error: Extraction timeout after 30000ms
```

**Related**: See Phase 7 documentation for cancellation architecture

---

### 4. **test-direction.js** - Text Direction Detection Test
**Purpose**: Verify automatic RTL/LTR text direction detection
**When to run**:
- After changes to direction detection algorithm
- When adding new RTL language support
- To verify Hebrew/Arabic PDFs extract correctly

**What it tests**:
- LTR detection (English CV)
- RTL detection (Hebrew document)
- Correct text ordering
- Hebrew character extraction (U+0590-U+05FF range)

**How to run**:
```bash
node manual-tests/test-direction.js
```

**Expected output**:
```
1. Testing LTR Detection:
   File: GalKahanaCV2025.pdf
   ✓ Detected direction: ltr

2. Testing RTL Detection:
   File: HebrewRTL.pdf
   ✓ Detected direction: rtl
   ✓ First 100 chars: נחל עיון ומפל התנור...
```

**Related**: See Phase 9 documentation for detection algorithm details

---

### 5. **inspect-hebrew-pdf.js** - Hebrew PDF Debugging Tool
**Purpose**: Debug tool to inspect Hebrew PDF encoding and character extraction
**When to run**:
- When debugging RTL text extraction issues
- To verify Hebrew character encoding
- When investigating garbled text output

**What it shows**:
- PDF metadata
- Extracted text length and direction
- Character codes (Unicode codepoints)
- First N characters with hex codes

**How to run**:
```bash
node manual-tests/inspect-hebrew-pdf.js
```

**Output example**:
```
Inspecting Hebrew PDF
File size: 2052480 bytes
Metadata: {...}
Direction: rtl
Character codes (first 50):
  0: 'נ' (U+05e0 / 1504)
  1: 'ח' (U+05d7 / 1495)
  ...
```

**Related**: Debugging tool for Phase 9 text direction detection

---

## Test PDFs

The tests use real PDFs from `../../test-materials/`:
- `HighLevelContentContext.pdf` - Simple single-page PDF with shapes
- `GalKahanaCV2025.pdf` - Multi-page LTR document with Unicode metadata
- `HebrewRTL.pdf` - Multi-page RTL Hebrew document (2MB, 10 pages)

## Recommendations

### Before Every Commit/PR
```bash
npm run test:all  # Runs Jest tests + integration-test.js
```

### Feature-Specific Testing
- **Working on threading?** → Run `verify-threading.js`
- **Working on timeouts?** → Run `verify-native-cancellation.js`
- **Working on RTL/LTR?** → Run `test-direction.js`
- **Debugging Hebrew text?** → Run `inspect-hebrew-pdf.js`

### Full Manual Verification
```bash
npm run test:all                           # All automated + integration
node manual-tests/verify-threading.js      # Threading
node manual-tests/verify-native-cancellation.js  # Cancellation
node manual-tests/test-direction.js        # Direction detection
```

## Output Conventions

- ✅ / ✓ : Test passed
- ❌ / ✗ : Test failed
- 🟦 Blue: Section headers
- 🟨 Yellow: Test descriptions
- 🟢 Green: Passing assertions
- 🔴 Red: Failures

## Why Manual Tests?

1. **Real-world verification**: Uses actual PDFs to catch issues mocks might miss
2. **Detailed output**: Colored logging and verbose output help during development
3. **Feature-specific**: Target specific features for faster iteration
4. **Debugging tools**: Tools like `inspect-hebrew-pdf.js` for investigation
5. **C++ verification**: Since C++ code lacks unit tests, these verify actual functionality

## Note on C++ Testing

Since the underlying C++ code doesn't have unit tests, these manual tests serve as critical verification that the native addon works correctly. They verify:
- Text is actually extracted (not just that API doesn't error)
- Content is correct (not garbled or corrupted)
- Unicode handling works (Hebrew: קורות חיים)
- Bidi algorithm produces readable output
- Threading and cancellation work at the native level
