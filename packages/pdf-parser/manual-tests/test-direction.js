const path = require('path');
const { PdfExtractor } = require('./dist/index.js');

async function testDirectionDetection() {
  const extractor = new PdfExtractor();

  console.log('Testing Text Direction Detection\n');
  console.log('='.repeat(60));

  // Test 1: LTR document (CV)
  try {
    const cvPath = path.join(__dirname, '../../test-materials/GalKahanaCV2025.pdf');
    console.log('\n1. Testing LTR Detection:');
    console.log(`   File: ${path.basename(cvPath)}`);

    const cvResult = await extractor.extractText(cvPath);

    console.log(`   ✓ Detected direction: ${cvResult.textDirection}`);
    console.log(`   ✓ Page count: ${cvResult.pageCount}`);
    console.log(`   ✓ Text length: ${cvResult.text.length} characters`);
    console.log(`   ✓ Processing time: ${cvResult.processingTime}ms`);

    if (cvResult.textDirection !== 'ltr') {
      console.error('   ✗ ERROR: Expected LTR but got', cvResult.textDirection);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ✗ ERROR testing LTR detection:', error.message);
    process.exit(1);
  }

  // Test 2: RTL document (Hebrew)
  try {
    const hebrewPath = path.join(__dirname, '../../test-materials/HebrewRTL.pdf');
    console.log('\n2. Testing RTL Detection:');
    console.log(`   File: ${path.basename(hebrewPath)}`);

    const hebrewResult = await extractor.extractText(hebrewPath);

    console.log(`   ✓ Detected direction: ${hebrewResult.textDirection}`);
    console.log(`   ✓ Page count: ${hebrewResult.pageCount}`);
    console.log(`   ✓ Text length: ${hebrewResult.text.length} characters`);
    console.log(`   ✓ Processing time: ${hebrewResult.processingTime}ms`);
    console.log(`   ✓ First 100 chars: ${hebrewResult.text.substring(0, 100)}`);

    if (hebrewResult.textDirection !== 'rtl') {
      console.error('   ✗ ERROR: Expected RTL but got', hebrewResult.textDirection);
      process.exit(1);
    }
  } catch (error) {
    console.error('   ✗ ERROR testing RTL detection:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ All direction detection tests passed!\n');
}

testDirectionDetection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
