import { PdfExtractor } from '../src/pdf-extractor';
import { PdfErrorCode } from '../src/types';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('Timeout and Cancellation', () => {
  // Use the larger CV PDF for better timeout testing
  const testPdfPath = path.join(__dirname, '../../../test-materials/GalKahanaCV2025.pdf');
  const fastPdfPath = path.join(__dirname, '../../../test-materials/HighLevelContentContext.pdf');

  describe('timeout functionality', () => {
    it('should complete successfully with sufficient timeout', async () => {
      const extractor = new PdfExtractor({ timeout: 30000 });
      const result = await extractor.extractText(fastPdfPath);

      expect(result.text).toBeTruthy();
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should timeout with very short timeout', async () => {
      // Use a 1ms timeout - should timeout before extraction completes
      const extractor = new PdfExtractor({ timeout: 1 });

      await expect(extractor.extractText(testPdfPath)).rejects.toMatchObject({
        code: PdfErrorCode.TIMEOUT,
      });
    }, 10000);

    it('should timeout buffer extraction with very short timeout', async () => {
      const buffer = await fs.readFile(testPdfPath);
      const extractor = new PdfExtractor({ timeout: 1 });

      await expect(extractor.extractTextFromBuffer(buffer)).rejects.toMatchObject({
        code: PdfErrorCode.TIMEOUT,
      });
    }, 10000);

    it('should handle metadata extraction with reasonable timeout', async () => {
      // Metadata extraction is typically fast, so we use reasonable timeout
      const extractor = new PdfExtractor({ timeout: 5000 });

      const result = await extractor.getMetadata(testPdfPath);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.version).toBeTruthy();
    });

    it('should handle metadata buffer extraction with reasonable timeout', async () => {
      const buffer = await fs.readFile(testPdfPath);
      const extractor = new PdfExtractor({ timeout: 5000 });

      const result = await extractor.getMetadataFromBuffer(buffer);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.version).toBeTruthy();
    });
  });

  describe('cancellation behavior', () => {
    it('should be able to cancel extraction via timeout', async () => {
      const extractor = new PdfExtractor({ timeout: 1 });
      const startTime = Date.now();

      try {
        await extractor.extractText(testPdfPath);
        fail('Should have timed out');
      } catch (error: unknown) {
        const elapsed = Date.now() - startTime;
        const pdfError = error as { code: string };
        expect(pdfError.code).toBe(PdfErrorCode.TIMEOUT);
        // Should fail quickly due to timeout
        expect(elapsed).toBeLessThan(1000);
      }
    });

    it('should handle multiple concurrent operations with different timeouts', async () => {
      const extractor1 = new PdfExtractor({ timeout: 1 });
      const extractor2 = new PdfExtractor({ timeout: 30000 });

      const [result1, result2] = await Promise.allSettled([
        extractor1.extractText(testPdfPath),
        extractor2.extractText(testPdfPath),
      ]);

      // First should timeout
      expect(result1.status).toBe('rejected');
      if (result1.status === 'rejected') {
        expect(result1.reason.code).toBe(PdfErrorCode.TIMEOUT);
      }

      // Second should succeed
      expect(result2.status).toBe('fulfilled');
      if (result2.status === 'fulfilled') {
        expect(result2.value.text).toBeTruthy();
      }
    }, 35000);
  });

  describe('async worker threading', () => {
    it('should run extractions asynchronously', async () => {
      const extractor = new PdfExtractor({ timeout: 30000 });

      // Start two extractions concurrently
      const start = Date.now();
      const promises = [extractor.extractText(fastPdfPath), extractor.extractText(fastPdfPath)];

      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;

      // Both should succeed
      expect(results[0].text).toBeTruthy();
      expect(results[1].text).toBeTruthy();

      // If running in parallel, should be faster than sequential
      // (Though this is hard to test reliably, we at least verify it works)
      console.log(`Concurrent extraction took ${elapsed}ms`);
    }, 35000);

    it('should handle rapid fire requests', async () => {
      const extractor = new PdfExtractor({ timeout: 30000 });

      // Launch 5 concurrent extractions
      const promises = Array(5)
        .fill(null)
        .map(() => extractor.extractText(fastPdfPath));

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.text).toBeTruthy();
        expect(result.pageCount).toBeGreaterThan(0);
      });
    }, 60000);
  });

  describe('promise completion after cancellation', () => {
    it('should reject promise when timeout occurs', async () => {
      const extractor = new PdfExtractor({ timeout: 1 });

      await expect(extractor.extractText(testPdfPath)).rejects.toThrow(
        /Operation timed out after 1ms/
      );
    });

    it('should not hang on timeout', async () => {
      const extractor = new PdfExtractor({ timeout: 1 });

      const startTime = Date.now();
      try {
        await extractor.extractText(testPdfPath);
        fail('Should have thrown');
      } catch (error) {
        const elapsed = Date.now() - startTime;
        // Should fail within a reasonable time (not hang)
        expect(elapsed).toBeLessThan(2000);
      }
    });
  });
});
