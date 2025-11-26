import { promises as fs } from 'fs';
import * as path from 'path';
import {
  PdfExtractionOptions,
  PdfExtractionResult,
  PdfMetadata,
  PdfExtractionError,
  PdfErrorCode,
} from './types';
import { validateFile, createDefaultOptions, withTimeout } from './utils';

interface NativeAddon {
  extractTextFromFile: (
    filePath: string,
    bidiDirection: number
  ) => Promise<{ text: string; pageCount: number; bidiDirection: number }>;
  extractTextFromBuffer: (
    buffer: Buffer,
    bidiDirection: number
  ) => Promise<{ text: string; pageCount: number; bidiDirection: number }>;
  getMetadataFromFile: (filePath: string) => Promise<PdfMetadata>;
  getMetadataFromBuffer: (buffer: Buffer) => Promise<PdfMetadata>;
}

// Load native addon
// The native addon is built by cmake-js and placed in the build/Release directory
let nativeAddon: NativeAddon;
try {
  const addonPath = path.join(__dirname, '..', 'build', 'Release', 'pdf_parser_native.node');
  nativeAddon = require(addonPath);
} catch (error) {
  // Try alternative path
  try {
    nativeAddon = require('../build/Release/pdf_parser_native.node');
  } catch (err) {
    throw new Error(
      'Failed to load native addon. Make sure to build the project with "npm run build:native"'
    );
  }
}

/**
 * Main PDF text extraction class
 */
export class PdfExtractor {
  private readonly options: Required<PdfExtractionOptions>;

  constructor(options: PdfExtractionOptions = {}) {
    this.options = createDefaultOptions(options);
  }

  /**
   * Extract text from a PDF file
   */
  async extractText(filePath: string): Promise<PdfExtractionResult> {
    const startTime = Date.now();

    try {
      // Validate file
      await validateFile(filePath, this.options.maxFileSize);

      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Extract text using native binding with timeout
      const result = await withTimeout(this.extractTextNative(filePath), this.options.timeout);

      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        pageCount: result.pageCount,
        processingTime,
        fileSize,
        textDirection: result.bidiDirection === 1 ? 'rtl' : 'ltr',
      };
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw error;
      }
      throw new PdfExtractionError(
        `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PdfErrorCode.EXTRACTION_FAILED,
        error
      );
    }
  }

  /**
   * Extract text from a PDF buffer
   */
  async extractTextFromBuffer(buffer: Buffer): Promise<PdfExtractionResult> {
    const startTime = Date.now();

    try {
      // Validate buffer size
      if (buffer.length > this.options.maxFileSize) {
        throw new PdfExtractionError(
          `File too large: ${buffer.length} bytes (max: ${this.options.maxFileSize})`,
          PdfErrorCode.FILE_TOO_LARGE
        );
      }

      // Extract text using native binding with timeout
      const result = await withTimeout(
        this.extractTextFromBufferNative(buffer),
        this.options.timeout
      );

      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        pageCount: result.pageCount,
        processingTime,
        fileSize: buffer.length,
        textDirection: result.bidiDirection === 1 ? 'rtl' : 'ltr',
      };
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw error;
      }
      throw new PdfExtractionError(
        `Failed to extract text from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PdfErrorCode.EXTRACTION_FAILED,
        error
      );
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(filePath: string): Promise<PdfMetadata> {
    try {
      await validateFile(filePath, this.options.maxFileSize);
      return await withTimeout(this.getMetadataNative(filePath), this.options.timeout);
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw error;
      }
      throw new PdfExtractionError(
        `Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PdfErrorCode.EXTRACTION_FAILED,
        error
      );
    }
  }

  /**
   * Get PDF metadata from buffer
   */
  async getMetadataFromBuffer(buffer: Buffer): Promise<PdfMetadata> {
    try {
      if (buffer.length > this.options.maxFileSize) {
        throw new PdfExtractionError(
          `File too large: ${buffer.length} bytes (max: ${this.options.maxFileSize})`,
          PdfErrorCode.FILE_TOO_LARGE
        );
      }
      return await withTimeout(this.getMetadataFromBufferNative(buffer), this.options.timeout);
    } catch (error) {
      if (error instanceof PdfExtractionError) {
        throw error;
      }
      throw new PdfExtractionError(
        `Failed to get metadata from buffer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PdfErrorCode.EXTRACTION_FAILED,
        error
      );
    }
  }

  // Native binding methods
  // Note: Bidi algorithm is ALWAYS applied by the native library when ICU is available.
  // Direction is auto-detected (-1) to determine whether text is RTL or LTR.
  //
  // These methods now use N-API async workers with true cancellation support.
  // The promise contains a _worker reference that can be used for cancellation.
  private async extractTextNative(filePath: string): Promise<{
    text: string;
    pageCount: number;
    bidiDirection: number;
  }> {
    const promise = nativeAddon.extractTextFromFile(filePath, -1 /* auto-detect */);
    return promise;
  }

  private async extractTextFromBufferNative(buffer: Buffer): Promise<{
    text: string;
    pageCount: number;
    bidiDirection: number;
  }> {
    const promise = nativeAddon.extractTextFromBuffer(buffer, -1 /* auto-detect */);
    return promise;
  }

  private async getMetadataNative(filePath: string): Promise<PdfMetadata> {
    const promise = nativeAddon.getMetadataFromFile(filePath);
    return promise;
  }

  private async getMetadataFromBufferNative(buffer: Buffer): Promise<PdfMetadata> {
    const promise = nativeAddon.getMetadataFromBuffer(buffer);
    return promise;
  }
}
