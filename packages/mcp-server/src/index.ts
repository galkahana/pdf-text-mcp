#!/usr/bin/env node

/**
 * PDF Text Extraction MCP Server - Entry Point
 *
 * This is the main entry point for the MCP server.
 * It loads configuration and starts the server.
 *
 * Usage:
 *   # Run directly
 *   node dist/index.js
 *
 *   # With custom configuration via environment variables
 *   PDF_DIRECTORY=/path/to/pdfs MAX_FILE_SIZE=52428800 node dist/index.js
 *
 * Environment Variables:
 *   PDF_DIRECTORY  - Base directory for PDF file resources (optional)
 *   MAX_FILE_SIZE  - Maximum file size in bytes (default: 100MB)
 *   TIMEOUT        - Extraction timeout in milliseconds (default: 30000)
 *   ENABLE_BIDI    - Enable bidirectional text support (default: true)
 */

import { PdfTextMcpServer } from './server';
import { loadConfig } from './config';

/**
 * Main function - starts the MCP server
 */
async function main() {
  try {
    // Load configuration from environment
    const config = loadConfig();

    // Create and start the server
    const server = new PdfTextMcpServer(config);
    await server.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`\nReceived ${signal}, shutting down gracefully...`);
      await server.stop();
      process.exit(0);
    };

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
main();
