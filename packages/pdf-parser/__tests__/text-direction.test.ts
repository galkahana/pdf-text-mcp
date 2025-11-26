import { describe, it, expect, beforeAll } from '@jest/globals';
import * as path from 'path';
import { PdfExtractor } from '../src/pdf-extractor';

describe('Text Direction Detection', () => {
  let extractor: PdfExtractor;

  beforeAll(() => {
    extractor = new PdfExtractor();
  });

  describe('LTR (Left-to-Right) Detection', () => {
    it('should correctly detect LTR direction for English document', async () => {
      const cvPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
      const result = await extractor.extractText(cvPath);

      expect(result.textDirection).toBe('ltr');
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should include textDirection in extraction result', async () => {
      const cvPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
      const result = await extractor.extractText(cvPath);

      expect(result).toHaveProperty('textDirection');
      expect(['ltr', 'rtl']).toContain(result.textDirection);
    });
  });

  describe('RTL (Right-to-Left) Detection', () => {
    it('should correctly detect RTL direction for Hebrew document', async () => {
      const hebrewPath = path.join(__dirname, '../../../test-materials/HebrewRTL.pdf');
      const result = await extractor.extractText(hebrewPath);

      expect(result.textDirection).toBe('rtl');
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should extract readable Hebrew text when detected as RTL', async () => {
      const hebrewPath = path.join(__dirname, '../../../test-materials/HebrewRTL.pdf');
      const result = await extractor.extractText(hebrewPath);

      // Check for Hebrew characters (Unicode range U+0590 to U+05FF)
      const hebrewCharRegex = /[\u0590-\u05FF]/;
      expect(hebrewCharRegex.test(result.text)).toBe(true);

      // Should contain readable text, not garbage characters
      expect(result.text).not.toMatch(/[�]/);  // No replacement characters
    });
  });

  describe('Buffer-based Extraction', () => {
    it('should detect LTR direction from buffer', async () => {
      const cvPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(cvPath);

      const result = await extractor.extractTextFromBuffer(buffer);

      expect(result.textDirection).toBe('ltr');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should detect RTL direction from buffer', async () => {
      const hebrewPath = path.join(__dirname, '../../../test-materials/HebrewRTL.pdf');
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(hebrewPath);

      const result = await extractor.extractTextFromBuffer(buffer);

      expect(result.textDirection).toBe('rtl');
      expect(result.text.length).toBeGreaterThan(0);

      // Check for Hebrew characters
      const hebrewCharRegex = /[\u0590-\u05FF]/;
      expect(hebrewCharRegex.test(result.text)).toBe(true);
    });
  });

  describe('Detection Algorithm', () => {
    it('should base detection on document layout and content', async () => {
      const hebrewPath = path.join(__dirname, '../../../test-materials/HebrewRTL.pdf');
      const result = await extractor.extractText(hebrewPath);

      // The detection should work based on:
      // 1. Alignment analysis (right-aligned text = RTL)
      // 2. Unicode script analysis (Hebrew characters = RTL)
      expect(result.textDirection).toBe('rtl');
    });

    it('should handle mixed-content documents', async () => {
      // CV might have some special characters but should still be LTR
      const cvPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
      const result = await extractor.extractText(cvPath);

      // Despite any mixed content, English documents should be LTR
      expect(result.textDirection).toBe('ltr');
    });
  });

  describe('Performance', () => {
    it('should detect direction efficiently for small documents', async () => {
      const cvPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
      const startTime = Date.now();

      await extractor.extractText(cvPath);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);  // Should complete within 1 second
    });

    it('should detect direction efficiently for larger documents', async () => {
      const hebrewPath = path.join(__dirname, '../../../test-materials/HebrewRTL.pdf');
      const startTime = Date.now();

      await extractor.extractText(hebrewPath);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);  // Should complete within 2 seconds
    });
  });
});
