import { promises as fs } from 'fs';
import {
  PdfExtractionOptions,
  PdfExtractionError,
  PdfErrorCode,
} from './types';

/**
 * Default configuration values
 */
export const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Create default options with user overrides
 */
export function createDefaultOptions(
  options: PdfExtractionOptions
): Required<PdfExtractionOptions> {
  return {
    maxFileSize: options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
  };
}

/**
 * Validate that a file exists and is accessible
 */
export async function validateFile(filePath: string, maxFileSize: number): Promise<void> {
  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new PdfExtractionError(
        `Path is not a file: ${filePath}`,
        PdfErrorCode.INVALID_FILE
      );
    }

    if (stats.size > maxFileSize) {
      throw new PdfExtractionError(
        `File too large: ${stats.size} bytes (max: ${maxFileSize})`,
        PdfErrorCode.FILE_TOO_LARGE
      );
    }

    // Check if file is readable
    await fs.access(filePath, fs.constants.R_OK);
  } catch (error) {
    if (error instanceof PdfExtractionError) {
      throw error;
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PdfExtractionError(
        `File not found: ${filePath}`,
        PdfErrorCode.INVALID_FILE
      );
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new PdfExtractionError(
        `File not readable: ${filePath}`,
        PdfErrorCode.INVALID_FILE
      );
    }

    throw new PdfExtractionError(
      `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      PdfErrorCode.INVALID_FILE,
      error
    );
  }
}

/**
 * Check if a buffer appears to be a valid PDF
 */
export function validatePdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  // Check for PDF magic number at the beginning
  const header = buffer.subarray(0, 4).toString('ascii');
  return header === '%PDF';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format processing time in human-readable format
 */
export function formatProcessingTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

/**
 * Create a promise that times out after specified milliseconds
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new PdfExtractionError(
              `Operation timed out after ${timeoutMs}ms`,
              PdfErrorCode.TIMEOUT
            )
          ),
        timeoutMs
      )
    ),
  ]);
}