/**
 * Type definitions for the MCP server
 */

import { z } from 'zod';

/**
 * Transport mode for MCP server
 */
export type TransportMode = 'stdio' | 'http';

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
  /** Transport mode: stdio for local, http for remote */
  transportMode: TransportMode;
  /** Port for HTTP server (only used when transportMode is 'http') */
  port?: number;
  /** Host for HTTP server (only used when transportMode is 'http') */
  host?: string;
  /** API key for authentication (optional, only used when transportMode is 'http') */
  apiKey?: string;
}

/**
 * Zod schema for extract_text tool parameters
 * This validates the JSON parameters sent by the AI
 */
export const ExtractTextParamsSchema = z.object({
  /** Path to the PDF file to extract text from */
  filePath: z.string().optional().describe('Path to the PDF file to extract text from'),
  /** Base64-encoded PDF content (alternative to filePath for remote deployment) */
  fileContent: z.string().optional().describe('Base64-encoded PDF content'),
}).refine(
  (data) => data.filePath || data.fileContent,
  { message: 'Either filePath or fileContent must be provided' }
);

export type ExtractTextParams = z.infer<typeof ExtractTextParamsSchema>;

/**
 * Zod schema for extract_metadata tool parameters
 */
export const ExtractMetadataParamsSchema = z.object({
  /** Path to the PDF file to extract metadata from */
  filePath: z
    .string()
    .optional()
    .describe('Path to the PDF file to extract metadata from'),
  /** Base64-encoded PDF content (alternative to filePath for remote deployment) */
  fileContent: z.string().optional().describe('Base64-encoded PDF content'),
}).refine(
  (data) => data.filePath || data.fileContent,
  { message: 'Either filePath or fileContent must be provided' }
);

export type ExtractMetadataParams = z.infer<typeof ExtractMetadataParamsSchema>;
