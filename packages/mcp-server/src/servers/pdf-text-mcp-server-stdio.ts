/**
 * MCP Server Implementation for PDF Text Extraction over STDIO.
 */

import { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ErrorCode,
  McpError,
  ServerRequest,
  ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ServerConfig } from '../types';
import { FilePathParamsSchema, FilePathParamsType } from '../schemas/stdio';
import { PDFTextMcpServer } from './pdf-text-mcp-server';
import { BasePdfTextMcpServer } from './base-pdf-text-mcp-server';
import * as fs from 'fs/promises';

export class PdfTextMcpServerStdio extends BasePdfTextMcpServer {
  constructor(config: ServerConfig) {
    super(config);
  }

  protected setupTools(): void {
    this.server.registerTool(
      'extract_text',
      {
        description:
          'Extract text content from a PDF file. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide filePath.',
        inputSchema: FilePathParamsSchema,
      },
      this.createFilePathOperationHandler((filePath: string) =>
        this.extractor.extractText(filePath)
      )
    );

    this.server.registerTool(
      'extract_metadata',
      {
        description:
          'Extract metadata from a PDF file including title, author, subject, creator, producer, dates, page count, and version. Provide filePath.',
        inputSchema: FilePathParamsSchema,
      },
      this.createFilePathOperationHandler((filePath: string) =>
        this.extractor.getMetadata(filePath)
      )
    );
  }

  private createFilePathOperationHandler<T>(
    operation: (filePath: string) => Promise<T>
  ): ToolCallback<typeof FilePathParamsSchema> {
    return async (
      args: FilePathParamsType,
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      try {
        // Validate parameters
        const { filePath } = args;

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          throw new McpError(ErrorCode.InvalidRequest, `File not found: ${filePath}`);
        }

        // Execute the operation
        const result = await operation(filePath);

        // Return result in MCP format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
  }

  /**
   * Start the MCP server with stdio transport.
   */
  async start(): Promise<void> {
    // Create stdio transport - server communicates via stdin/stdout
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await this.server.connect(transport);

    // Log to stderr (not stdout, which is used for MCP protocol)
    console.error('PDF Text Extraction MCP Server running on stdio');
    this.logConfiguration('stdio');
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    // Close MCP server
    await this.server.close();
    console.error('PDF Text Extraction MCP Server stopped.');
  }
}

export function buildFromConfig(config: ServerConfig): PDFTextMcpServer {
  return new PdfTextMcpServerStdio(config);
}
