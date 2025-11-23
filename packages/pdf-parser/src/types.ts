/**
 * Core types for PDF text extraction
 */

export interface PdfExtractionOptions {
  /** Maximum file size in bytes (default: 100MB) */
  maxFileSize?: number;
  /** Timeout for extraction in milliseconds (default: 30000) */
  timeout?: number;
}

export interface PdfExtractionResult {
  /** Extracted text content */
  text: string;
  /** Number of pages processed */
  pageCount: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** File size in bytes */
  fileSize: number;
}

export interface PdfMetadata {
  /** PDF title */
  title?: string;
  /** PDF author */
  author?: string;
  /** PDF subject */
  subject?: string;
  /** PDF creator */
  creator?: string;
  /** PDF producer */
  producer?: string;
  /** Creation date in PDF format (e.g., "D:20220101120000") */
  creationDate?: string;
  /** Modification date in PDF format (e.g., "D:20220101120000") */
  modificationDate?: string;
  /** Number of pages */
  pageCount: number;
  /** PDF version (e.g., "1.7") */
  version?: string;
}

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

export enum PdfErrorCode {
  INVALID_FILE = 'INVALID_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  NATIVE_ERROR = 'NATIVE_ERROR',
}
