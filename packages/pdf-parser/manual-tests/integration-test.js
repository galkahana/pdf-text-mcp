#!/usr/bin/env node
/**
 * Manual Integration Test for PDF Parser
 *
 * This test provides comprehensive manual verification of:
 * - Text extraction from files and buffers
 * - Metadata extraction from files and buffers
 * - Content verification with real PDFs
 *
 * Note: Bidirectional text support is always enabled.
 *
 * Run with: npm run test:manual
 */

const { PdfExtractor } = require('../dist/index');
const fs = require('fs');
const path = require('path');

// Test PDFs
const SIMPLE_PDF = path.join(__dirname, '../test-materials/HighLevelContentContext.pdf');
const CV_PDF = path.join(__dirname, '../test-materials/GalKahanaCV2025.pdf');

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testTextExtraction() {
  log('\n=== TEXT EXTRACTION TESTS ===', 'blue');

  const extractor = new PdfExtractor();

  // Test 1: Extract from simple PDF file
  log('\n1. Extract text from simple PDF file', 'yellow');
  const startTime = Date.now();
  const result = await extractor.extractText(SIMPLE_PDF);
  const elapsed = Date.now() - startTime;

  log(`   ✓ Extraction completed in ${elapsed}ms`, 'green');
  log(`   ✓ Page count: ${result.pageCount}`, 'green');
  log(`   ✓ File size: ${result.fileSize} bytes`, 'green');
  log(`   ✓ Text length: ${result.text.length} characters`, 'green');

  // Verify content
  assert(result.text.includes('Paths'), 'Should contain "Paths"');
  assert(result.text.includes('Squares'), 'Should contain "Squares"');
  assert(result.text.includes('Circles'), 'Should contain "Circles"');
  assert(result.text.includes('Rectangles'), 'Should contain "Rectangles"');
  log('   ✓ Content verification passed', 'green');

  // Test 2: Extract from buffer
  log('\n2. Extract text from buffer', 'yellow');
  const buffer = fs.readFileSync(SIMPLE_PDF);
  const bufferResult = await extractor.extractTextFromBuffer(buffer);

  log(`   ✓ Page count: ${bufferResult.pageCount}`, 'green');
  log(`   ✓ Text length: ${bufferResult.text.length} characters`, 'green');

  assert(bufferResult.text.includes('Paths'), 'Buffer extraction should contain "Paths"');
  assert(bufferResult.text.includes('Circles'), 'Buffer extraction should contain "Circles"');
  log('   ✓ Content verification passed', 'green');

  // Test 3: Extract from multi-page document
  log('\n3. Extract from multi-page CV document', 'yellow');
  const cvResult = await extractor.extractText(CV_PDF);

  log(`   ✓ Page count: ${cvResult.pageCount}`, 'green');
  log(`   ✓ Text length: ${cvResult.text.length} characters`, 'green');
  log(`   ✓ First 100 chars: ${cvResult.text.substring(0, 100).replace(/\n/g, ' ')}`, 'green');

  assert(cvResult.pageCount > 1, 'CV should have multiple pages');
  assert(cvResult.text.includes('Gal Kahana'), 'Should contain author name');
  assert(cvResult.text.includes('Curriculum Vitae'), 'Should contain CV title');
  assert(cvResult.text.includes('Tel Aviv'), 'Should contain location');
  log('   ✓ Multi-page content verification passed', 'green');
}

async function testMetadataExtraction() {
  log('\n=== METADATA EXTRACTION TESTS ===', 'blue');

  const extractor = new PdfExtractor();

  // Test 1: Get metadata from file
  log('\n1. Get metadata from CV PDF file', 'yellow');
  const metadata = await extractor.getMetadata(CV_PDF);

  log(`   ✓ Page count: ${metadata.pageCount}`, 'green');
  log(`   ✓ PDF version: ${metadata.version}`, 'green');
  log(`   ✓ Title: ${metadata.title || '(not set)'}`, 'green');
  log(`   ✓ Author: ${metadata.author || '(not set)'}`, 'green');
  log(`   ✓ Subject: ${metadata.subject || '(not set)'}`, 'green');
  log(`   ✓ Creator: ${metadata.creator || '(not set)'}`, 'green');
  log(`   ✓ Producer: ${metadata.producer || '(not set)'}`, 'green');
  log(`   ✓ Creation date: ${metadata.creationDate || '(not set)'}`, 'green');
  log(`   ✓ Modification date: ${metadata.modificationDate || '(not set)'}`, 'green');

  assert(metadata.pageCount > 0, 'Should have at least one page');
  assert(metadata.version, 'Should have PDF version');
  log('   ✓ Metadata extraction succeeded', 'green');

  // Test 2: Get metadata from buffer
  log('\n2. Get metadata from buffer', 'yellow');
  const buffer = fs.readFileSync(CV_PDF);
  const bufferMetadata = await extractor.getMetadataFromBuffer(buffer);

  log(`   ✓ Page count: ${bufferMetadata.pageCount}`, 'green');
  log(`   ✓ Version: ${bufferMetadata.version}`, 'green');

  assert(bufferMetadata.pageCount === metadata.pageCount, 'Buffer and file metadata should match');
  assert(bufferMetadata.version === metadata.version, 'Versions should match');
  log('   ✓ Buffer metadata matches file metadata', 'green');
}

async function testErrorHandling() {
  log('\n=== ERROR HANDLING TESTS ===', 'blue');

  const extractor = new PdfExtractor();

  // Test 1: Non-existent file
  log('\n1. Test non-existent file error', 'yellow');
  try {
    await extractor.extractText('/tmp/does-not-exist.pdf');
    throw new Error('Should have thrown error for non-existent file');
  } catch (error) {
    assert(error.code === 'INVALID_FILE', 'Should have INVALID_FILE error code');
    log(`   ✓ Correctly threw error: ${error.message}`, 'green');
  }

  // Test 2: File too large
  log('\n2. Test file size limit error', 'yellow');
  const tinyExtractor = new PdfExtractor({ maxFileSize: 100 });
  try {
    await tinyExtractor.extractText(CV_PDF);
    throw new Error('Should have thrown error for file too large');
  } catch (error) {
    assert(error.code === 'FILE_TOO_LARGE', 'Should have FILE_TOO_LARGE error code');
    log(`   ✓ Correctly threw error: ${error.message}`, 'green');
  }

  // Test 3: Buffer too large
  log('\n3. Test buffer size limit error', 'yellow');
  try {
    const largeBuffer = Buffer.alloc(200);
    await tinyExtractor.extractTextFromBuffer(largeBuffer);
    throw new Error('Should have thrown error for buffer too large');
  } catch (error) {
    assert(error.code === 'FILE_TOO_LARGE', 'Should have FILE_TOO_LARGE error code');
    log(`   ✓ Correctly threw error: ${error.message}`, 'green');
  }
}

async function runAllTests() {
  const startTime = Date.now();

  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║  PDF Parser Manual Integration Test   ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  try {
    // Check test files exist
    if (!fs.existsSync(SIMPLE_PDF)) {
      throw new Error(`Test PDF not found: ${SIMPLE_PDF}`);
    }
    if (!fs.existsSync(CV_PDF)) {
      throw new Error(`Test PDF not found: ${CV_PDF}`);
    }

    await testTextExtraction();
    await testMetadataExtraction();
    await testErrorHandling();

    const elapsed = Date.now() - startTime;
    log(`\n${'='.repeat(50)}`, 'green');
    log(`✅ ALL TESTS PASSED in ${elapsed}ms`, 'green');
    log('='.repeat(50), 'green');

    process.exit(0);
  } catch (error) {
    log(`\n${'='.repeat(50)}`, 'red');
    log(`❌ TEST FAILED: ${error.message}`, 'red');
    log('='.repeat(50), 'red');
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
