/**
 * Abstract base class for PDF Text MCP Server implementations.
 *
 * This class contains common initialization and setup logic shared between
 * stdio and HTTP server implementations, reducing code duplication and
 * ensuring consistent behavior across transport modes.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { ServerConfig } from '../types';
import { PDFTextMcpServer } from './pdf-text-mcp-server';

export abstract class BasePdfTextMcpServer implements PDFTextMcpServer {
  protected server: McpServer;
  protected extractor: PdfExtractor;
  protected config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    // Create the MCP Server instance
    // The Server class handles all the protocol details (JSON-RPC, initialization, etc.)
    this.server = new McpServer(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          // We support tools (functions the AI can call)
          tools: {},
        },
      }
    );

    // Initialize the PDF extractor with our configuration
    // Note: Bidi is always enabled at the native library level (requires ICU)
    this.extractor = new PdfExtractor({
      maxFileSize: config.maxFileSize,
      timeout: config.timeout,
    });

    // Let subclass register its specific tools
    this.setupTools();
  }

  /**
   * Register tools specific to the transport mode.
   * Subclasses must implement this to register extract_text and extract_metadata
   * with the appropriate input schemas and handlers.
   */
  protected abstract setupTools(): void;

  /**
   * Start the MCP server with the appropriate transport.
   * Subclasses must implement this to configure and start their specific transport.
   */
  abstract start(): Promise<void>;

  /**
   * Stop the server gracefully.
   * Subclasses must implement this to properly close their transport and resources.
   */
  abstract stop(): Promise<void>;

  /**
   * Log server configuration to stderr.
   * Helper method for consistent logging across implementations.
   */
  protected logConfiguration(
    transportMode: 'stdio' | 'http',
    additionalInfo?: Record<string, any>
  ): void {
    console.error(`Configuration:`, {
      maxFileSize: this.config.maxFileSize,
      timeout: this.config.timeout,
      transportMode,
      bidi: 'always enabled (requires ICU at build time)',
      ...additionalInfo,
    });
  }
}
