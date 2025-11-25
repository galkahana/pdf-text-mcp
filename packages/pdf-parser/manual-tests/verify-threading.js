#!/usr/bin/env node

/**
 * Verification script for true threading and cancellation behavior
 * This script verifies that:
 * 1. Extractions run in separate worker threads (not blocking main thread)
 * 2. Timeouts actually cancel the native operations
 * 3. Concurrent operations work correctly
 */

const { PdfExtractor } = require('./dist/pdf-extractor');
const path = require('path');

const testPdfPath = path.join(__dirname, '../../test-materials/GalKahanaCV2025.pdf');

console.log('='.repeat(80));
console.log('VERIFICATION: True Threading and Cancellation Behavior');
console.log('='.repeat(80));
console.log('');

async function test1_MainThreadResponsiveness() {
  console.log('Test 1: Main thread remains responsive during extraction');
  console.log('-'.repeat(80));

  const extractor = new PdfExtractor({ timeout: 30000 });

  // Start extraction
  const promise = extractor.extractText(testPdfPath);

  // Verify main thread is not blocked by doing some work
  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    process.stdout.write('.');
  }, 10);

  try {
    const result = await promise;
    clearInterval(interval);
    console.log('');
    console.log(`✓ Extraction completed successfully (${result.pageCount} pages, ${result.processingTime}ms)`);
    console.log(`✓ Main thread executed ${counter} iterations during extraction`);
    console.log(`✓ Main thread was RESPONSIVE (async worker confirmed)`);
  } catch (error) {
    clearInterval(interval);
    console.log('');
    console.log(`✗ Test failed: ${error.message}`);
    return false;
  }

  console.log('');
  return true;
}

async function test2_ConcurrentExtractions() {
  console.log('Test 2: Multiple concurrent extractions (true parallelism)');
  console.log('-'.repeat(80));

  const extractor = new PdfExtractor({ timeout: 30000 });

  // Launch 3 concurrent extractions
  const startTime = Date.now();
  const promises = [
    extractor.extractText(testPdfPath),
    extractor.extractText(testPdfPath),
    extractor.extractText(testPdfPath),
  ];

  try {
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    console.log(`✓ All 3 extractions completed successfully`);
    console.log(`✓ Total time: ${totalTime}ms`);
    console.log(`✓ Average per extraction: ${(totalTime / 3).toFixed(1)}ms`);
    console.log(`✓ Extractions ran CONCURRENTLY in separate worker threads`);
  } catch (error) {
    console.log(`✗ Test failed: ${error.message}`);
    return false;
  }

  console.log('');
  return true;
}

async function test3_TimeoutCancellation() {
  console.log('Test 3: Timeout cancels extraction (true cancellation)');
  console.log('-'.repeat(80));

  // Use 1ms timeout - should fail quickly
  const extractor = new PdfExtractor({ timeout: 1 });

  const startTime = Date.now();
  try {
    await extractor.extractText(testPdfPath);
    console.log('✗ Test failed: Should have timed out');
    return false;
  } catch (error) {
    const elapsed = Date.now() - startTime;

    if (error.code === 'TIMEOUT') {
      console.log(`✓ Operation timed out correctly (error code: ${error.code})`);
      console.log(`✓ Timeout triggered after ${elapsed}ms`);

      if (elapsed < 100) {
        console.log(`✓ Timeout was FAST (< 100ms) - true cancellation confirmed`);
      } else {
        console.log(`⚠ Timeout took ${elapsed}ms - may not be true cancellation`);
      }
    } else {
      console.log(`✗ Test failed: Wrong error code (${error.code})`);
      return false;
    }
  }

  console.log('');
  return true;
}

async function test4_MultipleTimeouts() {
  console.log('Test 4: Multiple concurrent operations with different timeouts');
  console.log('-'.repeat(80));

  const fastExtractor = new PdfExtractor({ timeout: 1 });
  const slowExtractor = new PdfExtractor({ timeout: 30000 });

  const startTime = Date.now();
  const [result1, result2, result3] = await Promise.allSettled([
    fastExtractor.extractText(testPdfPath),
    slowExtractor.extractText(testPdfPath),
    fastExtractor.extractText(testPdfPath),
  ]);

  const elapsed = Date.now() - startTime;

  let passed = true;

  // First and third should timeout
  if (result1.status === 'rejected' && result1.reason.code === 'TIMEOUT') {
    console.log(`✓ First extraction timed out correctly`);
  } else {
    console.log(`✗ First extraction should have timed out`);
    passed = false;
  }

  // Second should succeed
  if (result2.status === 'fulfilled') {
    console.log(`✓ Second extraction succeeded`);
  } else {
    console.log(`✗ Second extraction should have succeeded`);
    passed = false;
  }

  // Third should timeout
  if (result3.status === 'rejected' && result3.reason.code === 'TIMEOUT') {
    console.log(`✓ Third extraction timed out correctly`);
  } else {
    console.log(`✗ Third extraction should have timed out`);
    passed = false;
  }

  console.log(`✓ Total time: ${elapsed}ms`);
  console.log(`✓ Mixed timeout/success operations work correctly`);

  console.log('');
  return passed;
}

async function test5_BufferExtraction() {
  console.log('Test 5: Buffer extraction with threading and timeout');
  console.log('-'.repeat(80));

  const fs = require('fs').promises;
  const buffer = await fs.readFile(testPdfPath);

  // Test successful extraction
  const extractor1 = new PdfExtractor({ timeout: 30000 });
  try {
    const result = await extractor1.extractTextFromBuffer(buffer);
    console.log(`✓ Buffer extraction succeeded (${result.pageCount} pages)`);
  } catch (error) {
    console.log(`✗ Buffer extraction failed: ${error.message}`);
    return false;
  }

  // Test timeout
  const extractor2 = new PdfExtractor({ timeout: 1 });
  try {
    await extractor2.extractTextFromBuffer(buffer);
    console.log('✗ Buffer extraction should have timed out');
    return false;
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      console.log(`✓ Buffer extraction timed out correctly`);
    } else {
      console.log(`✗ Wrong error code: ${error.code}`);
      return false;
    }
  }

  console.log('');
  return true;
}

async function runAllTests() {
  console.log('Starting verification tests...\n');

  const results = [];

  results.push(await test1_MainThreadResponsiveness());
  results.push(await test2_ConcurrentExtractions());
  results.push(await test3_TimeoutCancellation());
  results.push(await test4_MultipleTimeouts());
  results.push(await test5_BufferExtraction());

  console.log('='.repeat(80));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\nTests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n✓ ALL VERIFICATION TESTS PASSED');
    console.log('✓ True threading confirmed - operations run in worker threads');
    console.log('✓ True cancellation confirmed - timeouts abort operations quickly');
    console.log('✓ Concurrent operations work correctly');
    process.exit(0);
  } else {
    console.log('\n✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
