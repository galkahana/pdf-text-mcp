const path = require('path');
const { PdfExtractor } = require('./dist/index.js');
const fs = require('fs');

async function inspectHebrewPDF() {
  const extractor = new PdfExtractor();
  const hebrewPath = path.join(__dirname, '../../test-materials/HebrewRTL.pdf');

  console.log('Inspecting Hebrew PDF\n');
  console.log('File:', hebrewPath);
  console.log('File size:', fs.statSync(hebrewPath).size, 'bytes');
  console.log('='.repeat(60));

  try {
    // Get metadata
    const metadata = await extractor.getMetadata(hebrewPath);
    console.log('\nMetadata:');
    console.log(JSON.stringify(metadata, null, 2));

    // Extract text
    const result = await extractor.extractText(hebrewPath);
    console.log('\nExtraction Result:');
    console.log('  Direction:', result.textDirection);
    console.log('  Page count:', result.pageCount);
    console.log('  Text length:', result.text.length);
    console.log('  Processing time:', result.processingTime, 'ms');

    console.log('\nRaw text (first 500 chars):');
    console.log(result.text.substring(0, 500));

    console.log('\nCharacter codes (first 50 characters):');
    for (let i = 0; i < Math.min(50, result.text.length); i++) {
      const char = result.text[i];
      const code = char.charCodeAt(0);
      const hex = code.toString(16).padStart(4, '0');
      console.log(`  ${i}: '${char}' (U+${hex} / ${code})`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

inspectHebrewPDF().catch(console.error);
