import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  validateFile,
  validatePdfBuffer,
  formatFileSize,
  formatProcessingTime,
  withTimeout,
  createDefaultOptions,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_TIMEOUT,
} from '../src/utils';
import { BidiDirection, PdfExtractionError, PdfErrorCode } from '../src/types';

describe('Utils', () => {
  let tempDir: string;
  let testFile: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-parser-test-'));
    testFile = path.join(tempDir, 'test.pdf');
    await fs.writeFile(testFile, '%PDF-1.4\nTest PDF content');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('createDefaultOptions', () => {
    it('should create default options with no overrides', () => {
      const options = createDefaultOptions({});
      expect(options).toEqual({
        bidiDirection: BidiDirection.LTR,
        maxFileSize: DEFAULT_MAX_FILE_SIZE,
        timeout: DEFAULT_TIMEOUT,
      });
    });

    it('should merge user options with defaults', () => {
      const options = createDefaultOptions({
        bidiDirection: BidiDirection.RTL,
        maxFileSize: 50 * 1024 * 1024,
      });
      expect(options).toEqual({
        bidiDirection: BidiDirection.RTL,
        maxFileSize: 50 * 1024 * 1024,
        timeout: DEFAULT_TIMEOUT,
      });
    });
  });

  describe('validateFile', () => {
    it('should validate existing file within size limit', async () => {
      await expect(validateFile(testFile, 1024 * 1024)).resolves.toBeUndefined();
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.pdf');
      await expect(validateFile(nonExistentFile, 1024 * 1024)).rejects.toThrow(
        PdfExtractionError
      );
      await expect(validateFile(nonExistentFile, 1024 * 1024)).rejects.toMatchObject({
        code: PdfErrorCode.INVALID_FILE,
      });
    });

    it('should throw error for file too large', async () => {
      await expect(validateFile(testFile, 10)).rejects.toThrow(PdfExtractionError);
      await expect(validateFile(testFile, 10)).rejects.toMatchObject({
        code: PdfErrorCode.FILE_TOO_LARGE,
      });
    });

    it('should throw error for directory', async () => {
      await expect(validateFile(tempDir, 1024 * 1024)).rejects.toThrow(PdfExtractionError);
      await expect(validateFile(tempDir, 1024 * 1024)).rejects.toMatchObject({
        code: PdfErrorCode.INVALID_FILE,
      });
    });
  });

  describe('validatePdfBuffer', () => {
    it('should validate valid PDF buffer', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nTest content');
      expect(validatePdfBuffer(validPdfBuffer)).toBe(true);
    });

    it('should reject invalid PDF buffer', () => {
      const invalidBuffer = Buffer.from('Not a PDF file');
      expect(validatePdfBuffer(invalidBuffer)).toBe(false);
    });

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(validatePdfBuffer(emptyBuffer)).toBe(false);
    });

    it('should reject buffer too short', () => {
      const shortBuffer = Buffer.from('PDF');
      expect(validatePdfBuffer(shortBuffer)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('formatProcessingTime', () => {
    it('should format milliseconds correctly', () => {
      expect(formatProcessingTime(500)).toBe('500ms');
      expect(formatProcessingTime(1000)).toBe('1.0s');
      expect(formatProcessingTime(1500)).toBe('1.5s');
      expect(formatProcessingTime(60000)).toBe('1m 0.0s');
      expect(formatProcessingTime(90000)).toBe('1m 30.0s');
      expect(formatProcessingTime(125000)).toBe('2m 5.0s');
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject when promise times out', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      await expect(withTimeout(promise, 50)).rejects.toThrow(PdfExtractionError);
      await expect(withTimeout(promise, 50)).rejects.toMatchObject({
        code: PdfErrorCode.TIMEOUT,
      });
    });

    it('should reject when promise rejects', async () => {
      const promise = Promise.reject(new Error('Original error'));
      await expect(withTimeout(promise, 1000)).rejects.toThrow('Original error');
    });
  });
});