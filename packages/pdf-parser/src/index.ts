/**
 * PDF Text Extraction Library
 *
 * TypeScript wrapper for the pdf-text-extraction C++ library
 * Provides clean, type-safe APIs for extracting text from PDF files
 */

export { PdfExtractor } from './pdf-extractor';
export {
  BidiDirection,
  PdfExtractionOptions,
  PdfExtractionResult,
  PdfMetadata,
  PdfExtractionError,
  PdfErrorCode,
} from './types';
export {
  validateFile,
  validatePdfBuffer,
  formatFileSize,
  formatProcessingTime,
  withTimeout,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_TIMEOUT,
} from './utils';

// Re-export for convenience
export { PdfExtractor as default } from './pdf-extractor';