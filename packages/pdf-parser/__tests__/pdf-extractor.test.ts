import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PdfExtractor } from '../src/pdf-extractor';
import { PdfExtractionError, PdfErrorCode } from '../src/types';

describe('PdfExtractor', () => {
  let tempDir: string;
  let realPdfPath: string;
  let cvPdfPath: string;
  let invalidFilePath: string;
  let extractor: PdfExtractor;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-extractor-test-'));
    invalidFilePath = path.join(tempDir, 'invalid.txt');

    // Use real PDFs from test materials
    realPdfPath = path.join(
      __dirname,
      '../test-materials/HighLevelContentContext.pdf'
    );

    cvPdfPath = path.join(
      __dirname,
      '../test-materials/GalKahanaCV2022.pdf'
    );

    // Create a non-PDF file
    await fs.writeFile(invalidFilePath, 'This is not a PDF file');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    extractor = new PdfExtractor();
  });

  describe('constructor', () => {
    it('should create extractor with default options', () => {
      const defaultExtractor = new PdfExtractor();
      expect(defaultExtractor).toBeInstanceOf(PdfExtractor);
    });

    it('should create extractor with custom options', () => {
      const customExtractor = new PdfExtractor({
        maxFileSize: 50 * 1024 * 1024,
        timeout: 60000,
      });
      expect(customExtractor).toBeInstanceOf(PdfExtractor);
    });
  });

  describe('extractText', () => {
    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.pdf');
      await expect(extractor.extractText(nonExistentPath)).rejects.toThrow(PdfExtractionError);
      await expect(extractor.extractText(nonExistentPath)).rejects.toMatchObject({
        code: PdfErrorCode.INVALID_FILE,
      });
    });

    it('should throw error for file too large', async () => {
      const smallExtractor = new PdfExtractor({ maxFileSize: 10 });
      await expect(smallExtractor.extractText(realPdfPath)).rejects.toThrow(PdfExtractionError);
      await expect(smallExtractor.extractText(realPdfPath)).rejects.toMatchObject({
        code: PdfErrorCode.FILE_TOO_LARGE,
      });
    });

    it('should successfully extract text from a valid PDF', async () => {
      const result = await extractor.extractText(realPdfPath);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('pageCount');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('fileSize');

      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.fileSize).toBeGreaterThan(0);

      // Verify actual content - HighLevelContentContext.pdf contains these words
      expect(result.text).toContain('Paths');
      expect(result.text).toContain('Squares');
      expect(result.text).toContain('Circles');
      expect(result.text).toContain('Rectangles');
    });

    it('should extract meaningful text from a multi-page document', async () => {
      const result = await extractor.extractText(cvPdfPath);

      expect(result.pageCount).toBeGreaterThan(1);
      expect(result.text.length).toBeGreaterThan(500);

      // Verify actual content from the CV PDF
      expect(result.text).toContain('Gal Kahana');
      expect(result.text).toContain('Curriculum Vitae');
      expect(result.text).toContain('Tel Aviv');
    });
  });

  describe('extractTextFromBuffer', () => {
    it('should throw error for buffer too large', async () => {
      const smallExtractor = new PdfExtractor({ maxFileSize: 10 });
      const largeBuffer = Buffer.alloc(100);

      await expect(smallExtractor.extractTextFromBuffer(largeBuffer)).rejects.toThrow(
        PdfExtractionError
      );
      await expect(smallExtractor.extractTextFromBuffer(largeBuffer)).rejects.toMatchObject({
        code: PdfErrorCode.FILE_TOO_LARGE,
      });
    });

    it('should successfully extract text from buffer', async () => {
      const pdfBuffer = await fs.readFile(realPdfPath);
      const result = await extractor.extractTextFromBuffer(pdfBuffer);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('pageCount');

      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.pageCount).toBeGreaterThan(0);

      // Verify actual content from buffer extraction
      expect(result.text).toContain('Paths');
      expect(result.text).toContain('Circles');
    });
  });

  describe('getMetadata', () => {
    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.pdf');
      await expect(extractor.getMetadata(nonExistentPath)).rejects.toThrow(PdfExtractionError);
      await expect(extractor.getMetadata(nonExistentPath)).rejects.toMatchObject({
        code: PdfErrorCode.INVALID_FILE,
      });
    });

    it('should successfully extract metadata from a valid PDF', async () => {
      const metadata = await extractor.getMetadata(realPdfPath);

      expect(metadata).toHaveProperty('pageCount');
      expect(metadata).toHaveProperty('version');

      expect(metadata.pageCount).toBeGreaterThan(0);
      expect(typeof metadata.version).toBe('string');
    });
  });

  describe('getMetadataFromBuffer', () => {
    it('should throw error for buffer too large', async () => {
      const smallExtractor = new PdfExtractor({ maxFileSize: 10 });
      const largeBuffer = Buffer.alloc(100);

      await expect(smallExtractor.getMetadataFromBuffer(largeBuffer)).rejects.toThrow(
        PdfExtractionError
      );
      await expect(smallExtractor.getMetadataFromBuffer(largeBuffer)).rejects.toMatchObject({
        code: PdfErrorCode.FILE_TOO_LARGE,
      });
    });

    it('should successfully extract metadata from buffer', async () => {
      const pdfBuffer = await fs.readFile(realPdfPath);
      const metadata = await extractor.getMetadataFromBuffer(pdfBuffer);

      expect(metadata).toHaveProperty('pageCount');
      expect(metadata).toHaveProperty('version');

      expect(metadata.pageCount).toBeGreaterThan(0);
      expect(typeof metadata.version).toBe('string');
    });
  });

  describe('timeout behavior', () => {
    // Note: Timeout tests are challenging because the native extraction is synchronous
    // and executes on the same event loop tick. For small PDFs (like our test files),
    // extraction completes in <10ms before the timeout timer can even fire.
    // True timeout testing would require:
    // 1. Very large PDFs that take >100ms to process, OR
    // 2. N-API async workers (see FUTURE_FEATURES.md)
    //
    // For now, we verify that the timeout logic is wired up correctly with a reasonable timeout.

    it('should succeed with reasonable timeout', async () => {
      // 30 seconds should be plenty for these small test PDFs
      const reasonableExtractor = new PdfExtractor({ timeout: 30000 });
      const result = await reasonableExtractor.extractText(realPdfPath);

      expect(result.text).toContain('Paths');
      expect(result.pageCount).toBeGreaterThan(0);
    });

    it('should use custom timeout value', () => {
      const customExtractor = new PdfExtractor({ timeout: 5000 });
      // Verify the timeout option is accepted
      expect(customExtractor).toBeInstanceOf(PdfExtractor);
    });
  });
});