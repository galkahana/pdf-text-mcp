/**
 * Configuration management for the MCP server
 * Loads settings from environment variables with sensible defaults
 */

import { ServerConfig, TransportMode } from './types';
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_TIMEOUT } from '@pdf-text-mcp/pdf-parser';

/**
 * Load server configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  // Transport mode: stdio (default) for local Claude Desktop, websocket for remote deployment
  const transportMode = (process.env.TRANSPORT_MODE as TransportMode) || 'stdio';

  return {
    name: 'pdf-text-mcp-server',
    version: '1.0.0',
    // Maximum file size (default: 100MB)
    maxFileSize: process.env.MAX_FILE_SIZE
      ? Math.floor(Number(process.env.MAX_FILE_SIZE))
      : DEFAULT_MAX_FILE_SIZE,
    // Extraction timeout (default: 30 seconds)
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : DEFAULT_TIMEOUT,
    // Transport configuration
    transportMode,
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    host: process.env.HOST || '0.0.0.0',
    apiKey: process.env.API_KEY,
  };
}
