/**
 * Configuration management for the MCP server
 * Loads settings from environment variables with sensible defaults
 */

import { ServerConfig } from './types';
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_TIMEOUT } from '@pdf-text-mcp/pdf-parser';

/**
 * Load server configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  return {
    name: 'pdf-text-mcp-server',
    version: '1.0.0',
    // Maximum file size (default: 100MB)
    maxFileSize: process.env.MAX_FILE_SIZE
      ? parseInt(process.env.MAX_FILE_SIZE, 10)
      : DEFAULT_MAX_FILE_SIZE,
    // Extraction timeout (default: 30 seconds)
    timeout: process.env.TIMEOUT
      ? parseInt(process.env.TIMEOUT, 10)
      : DEFAULT_TIMEOUT,
  };
}
