/**
 * MCP Server Implementation for PDF Text Extraction over STDIO.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { ServerConfig } from '../types';
import { FilePathParamsSchema, FilePathToolSchema } from '../schemas/stdio';
import { PDFTextMcpServer, ToolDefinition } from './pdf-text-mcp-server';
import * as fs from 'fs/promises';

export class PdfTextMcpServerStdio implements PDFTextMcpServer {
  private server: Server;
  private extractor: PdfExtractor;
  private config: ServerConfig;
  private requestCount: number = 0;
  private errorCount: number = 0;

  private tools: Record<string, ToolDefinition> = {
    extract_text: {
      description:
        'Extract text content from a PDF file. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide filePath.',
      inputSchema: FilePathToolSchema,
      implementation: this.createFilePathOperationHandler(filePath =>
        this.extractor.extractText(filePath)
      ),
    },
    extract_metadata: {
      description:
        'Extract metadata from a PDF file including title, author, subject, creator, producer, dates, page count, and version. Provide filePath.',
      inputSchema: FilePathToolSchema,
      implementation: this.createFilePathOperationHandler(filePath =>
        this.extractor.getMetadata(filePath)
      ),
    },
  };

  constructor(config: ServerConfig) {
    this.config = config;

    // Create the MCP Server instance
    // The Server class handles all the protocol details (JSON-RPC, initialization, etc.)
    this.server = new Server(
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

    this.setupHandlers();
  }

  /**
   * Set up request handlers for the MCP protocol
   */
  private setupHandlers(): void {
    // Handler: tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(this.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Handler: tools/call
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      this.requestCount++;

      try {
        const tool = this.tools[name];

        if (!tool) {
          this.errorCount++;
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return await tool.implementation(args);
      } catch (error) {
        this.errorCount++;

        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private createFilePathOperationHandler<T>(operation: (filePath: string) => Promise<T>): (
    args: unknown
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    return async (args: unknown) => {
      // Validate parameters
      const { filePath } = FilePathParamsSchema.parse(args);

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
    };
  }

  /**
   * Start the MCP server
   * This connects the server to stdio or HTTP transport depending on configuration
   */
  async start(): Promise<void> {
    // Create stdio transport
    // This means the server communicates via standard input/output
    // Perfect for local tools that are launched by the AI assistant
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    // This starts listening for JSON-RPC messages on stdin
    await this.server.connect(transport);

    // Log to stderr (not stdout, which is used for MCP protocol)
    console.error('PDF Text Extraction MCP Server running on stdio');
    console.error(`Configuration:`, {
      maxFileSize: this.config.maxFileSize,
      timeout: this.config.timeout,
      transportMode: 'stdio',
      bidi: 'always enabled (requires ICU at build time)',
    });
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
