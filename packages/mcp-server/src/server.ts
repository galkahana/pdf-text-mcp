/**
 * MCP Server Implementation for PDF Text Extraction
 *
 * This server implements the Model Context Protocol (MCP), which is a standardized
 * way for AI assistants to interact with external tools and data sources.
 *
 * Protocol Flow:
 * 1. Client (AI) sends "initialize" request with protocol version
 * 2. Server responds with its capabilities (tools, resources, prompts)
 * 3. Client can then:
 *    - Call "tools/list" to see available tools
 *    - Call "tools/call" to execute a tool
 *    - Call "resources/list" to see available resources
 *    - Call "resources/read" to read a resource
 *
 * Communication Format:
 * - Uses JSON-RPC 2.0 over stdio (standard input/output)
 * - Each message has: { jsonrpc: "2.0", id, method, params }
 * - Server responds with: { jsonrpc: "2.0", id, result } or { jsonrpc: "2.0", id, error }
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
import { ServerConfig } from './types';
import {
  ExtractTextParamsSchema,
  ExtractMetadataParamsSchema,
} from './types';
import * as fs from 'fs/promises';

/**
 * PDF Text Extraction MCP Server
 *
 * Exposes two tools that the AI can call:
 * 1. extract_text - Extract text content from a PDF file
 * 2. extract_metadata - Extract metadata (title, author, dates, etc.) from a PDF file
 */
export class PdfTextMcpServer {
  private server: Server;
  private extractor: PdfExtractor;
  private config: ServerConfig;

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
   *
   * MCP uses a request/response pattern. The server registers handlers
   * for different request types (tools/list, tools/call, etc.)
   */
  private setupHandlers(): void {
    // Handler: tools/list
    // The AI calls this to discover what tools are available
    // We respond with a list of tool definitions including name, description, and parameter schema
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'extract_text',
          description:
            'Extract text content from a PDF file. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute or relative path to the PDF file',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'extract_metadata',
          description:
            'Extract metadata from a PDF file including title, author, subject, creator, producer, dates, page count, and version.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute or relative path to the PDF file',
              },
            },
            required: ['filePath'],
          },
        },
      ],
    }));

    // Handler: tools/call
    // The AI calls this to execute a tool
    // We validate parameters, execute the tool, and return results
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'extract_text':
            return await this.handleExtractText(args);
          case 'extract_metadata':
            return await this.handleExtractMetadata(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        // Convert errors to MCP error format
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

  /**
   * Handle extract_text tool call
   */
  private async handleExtractText(args: unknown) {
    // Validate parameters using Zod schema
    const params = ExtractTextParamsSchema.parse(args);

    // Use file path as provided (can be absolute or relative)
    const filePath = params.filePath;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `File not found: ${filePath}`
      );
    }

    // Extract text (bidi is always enabled at native library level)
    const result = await this.extractor.extractText(filePath);

    // Return result in MCP format
    // The content is returned as an array of "text" or "image" or "resource" items
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              text: result.text,
              pageCount: result.pageCount,
              fileSize: result.fileSize,
              processingTime: result.processingTime,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle extract_metadata tool call
   */
  private async handleExtractMetadata(args: unknown) {
    // Validate parameters
    const params = ExtractMetadataParamsSchema.parse(args);

    // Use file path as provided (can be absolute or relative)
    const filePath = params.filePath;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `File not found: ${filePath}`
      );
    }

    // Extract metadata
    const metadata = await this.extractor.getMetadata(filePath);

    // Return result in MCP format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  }

  /**
   * Start the MCP server
   * This connects the server to stdio transport (reads from stdin, writes to stdout)
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
      bidi: 'always enabled (requires ICU at build time)',
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    await this.server.close();
  }
}
