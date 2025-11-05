/**
 * Type definitions for the MCP server
 */

import { z } from 'zod';

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Name of the server */
  name: string;
  /** Version of the server */
  version: string;
  /** Maximum file size for PDF processing (bytes) */
  maxFileSize?: number;
  /** Timeout for PDF extraction (milliseconds) */
  timeout?: number;
}

/**
 * Zod schema for extract_text tool parameters
 * This validates the JSON parameters sent by the AI
 */
export const ExtractTextParamsSchema = z.object({
  /** Path to the PDF file to extract text from */
  filePath: z.string().describe('Path to the PDF file to extract text from'),
});

export type ExtractTextParams = z.infer<typeof ExtractTextParamsSchema>;

/**
 * Zod schema for extract_metadata tool parameters
 */
export const ExtractMetadataParamsSchema = z.object({
  /** Path to the PDF file to extract metadata from */
  filePath: z
    .string()
    .describe('Path to the PDF file to extract metadata from'),
});

export type ExtractMetadataParams = z.infer<typeof ExtractMetadataParamsSchema>;
