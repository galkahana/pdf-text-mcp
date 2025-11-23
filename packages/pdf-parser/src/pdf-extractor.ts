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

// Load native addon
// The native addon is built by cmake-js and placed in the build/Release directory
let nativeAddon: any;
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
  // Note: Bidi direction is always LTR (0). The bidi algorithm is ALWAYS applied
  // by the native library when ICU is available (required at build time).
  //
  // TIMEOUT LIMITATION: These native calls use synchronous C++ code wrapped in Promises.
  // The timeout is "soft" - it rejects the promise after the timeout, but the native
  // code continues running in the background until completion.
  // TODO: Implement true cancellation using N-API async workers (see FUTURE_FEATURES.md)
  private async extractTextNative(filePath: string): Promise<{
    text: string;
    pageCount: number;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const result = nativeAddon.extractTextFromFile(filePath, 0 /* LTR */);
        resolve(result);
      } catch (error) {
        reject(
          new PdfExtractionError(
            `Native extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            PdfErrorCode.NATIVE_ERROR,
            error
          )
        );
      }
    });
  }

  private async extractTextFromBufferNative(buffer: Buffer): Promise<{
    text: string;
    pageCount: number;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const result = nativeAddon.extractTextFromBuffer(buffer, 0 /* LTR */);
        resolve(result);
      } catch (error) {
        reject(
          new PdfExtractionError(
            `Native extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            PdfErrorCode.NATIVE_ERROR,
            error
          )
        );
      }
    });
  }

  private async getMetadataNative(filePath: string): Promise<PdfMetadata> {
    return new Promise((resolve, reject) => {
      try {
        const result = nativeAddon.getMetadataFromFile(filePath);
        // Dates are returned as PDF date strings (e.g., "D:20220101120000")
        // Leave them as strings for now - can be parsed later if needed
        resolve(result);
      } catch (error) {
        reject(
          new PdfExtractionError(
            `Native metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            PdfErrorCode.NATIVE_ERROR,
            error
          )
        );
      }
    });
  }

  private async getMetadataFromBufferNative(buffer: Buffer): Promise<PdfMetadata> {
    return new Promise((resolve, reject) => {
      try {
        const result = nativeAddon.getMetadataFromBuffer(buffer);
        // Dates are returned as PDF date strings (e.g., "D:20220101120000")
        // Leave them as strings for now - can be parsed later if needed
        resolve(result);
      } catch (error) {
        reject(
          new PdfExtractionError(
            `Native metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            PdfErrorCode.NATIVE_ERROR,
            error
          )
        );
      }
    });
  }
}
