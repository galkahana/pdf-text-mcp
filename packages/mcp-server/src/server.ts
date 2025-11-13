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
 * - Uses JSON-RPC 2.0 over stdio (standard input/output) or WebSocket
 * - Each message has: { jsonrpc: "2.0", id, method, params }
 * - Server responds with: { jsonrpc: "2.0", id, result } or { jsonrpc: "2.0", id, error }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
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
import express from 'express';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

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
  private httpServer?: any;
  private transport?: StreamableHTTPServerTransport;
  private ready: boolean = false;
  private requestCount: number = 0;
  private errorCount: number = 0;

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
            'Extract text content from a PDF file or base64-encoded content. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide either filePath (for local files) or fileContent (base64-encoded PDF for remote deployment).',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute or relative path to the PDF file (for local deployment)',
              },
              fileContent: {
                type: 'string',
                description: 'Base64-encoded PDF content (for remote deployment)',
              },
            },
            oneOf: [
              { required: ['filePath'] },
              { required: ['fileContent'] },
            ],
          },
        },
        {
          name: 'extract_metadata',
          description:
            'Extract metadata from a PDF file or base64-encoded content including title, author, subject, creator, producer, dates, page count, and version. Provide either filePath (for local files) or fileContent (base64-encoded PDF for remote deployment).',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute or relative path to the PDF file (for local deployment)',
              },
              fileContent: {
                type: 'string',
                description: 'Base64-encoded PDF content (for remote deployment)',
              },
            },
            oneOf: [
              { required: ['filePath'] },
              { required: ['fileContent'] },
            ],
          },
        },
      ],
    }));

    // Handler: tools/call
    // The AI calls this to execute a tool
    // We validate parameters, execute the tool, and return results
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Track metrics
      this.requestCount++;

      try {
        switch (name) {
          case 'extract_text':
            return await this.handleExtractText(args);
          case 'extract_metadata':
            return await this.handleExtractMetadata(args);
          default:
            this.errorCount++;
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        // Track error
        this.errorCount++;

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

    let result;

    if (params.filePath) {
      // File path mode (local deployment)
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
      result = await this.extractor.extractText(filePath);
    } else if (params.fileContent) {
      // Base64 content mode (remote deployment)
      try {
        // Decode base64 content to buffer
        const buffer = Buffer.from(params.fileContent, 'base64');

        // Check file size
        if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `File size (${buffer.length} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`
          );
        }

        // Extract text from buffer
        result = await this.extractor.extractTextFromBuffer(buffer);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Failed to decode or process PDF content: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Either filePath or fileContent must be provided'
      );
    }

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

    let metadata;

    if (params.filePath) {
      // File path mode (local deployment)
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
      metadata = await this.extractor.getMetadata(filePath);
    } else if (params.fileContent) {
      // Base64 content mode (remote deployment)
      try {
        // Decode base64 content to buffer
        const buffer = Buffer.from(params.fileContent, 'base64');

        // Check file size
        if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `File size (${buffer.length} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`
          );
        }

        // Extract metadata from buffer
        metadata = await this.extractor.getMetadataFromBuffer(buffer);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Failed to decode or process PDF content: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Either filePath or fileContent must be provided'
      );
    }

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
   * This connects the server to stdio or HTTP transport depending on configuration
   */
  async start(): Promise<void> {
    if (this.config.transportMode === 'stdio') {
      await this.startStdioMode();
    } else {
      await this.startHttpMode();
    }

    // Mark as ready
    this.ready = true;
  }

  /**
   * Start server in stdio mode (for local Claude Desktop)
   */
  private async startStdioMode(): Promise<void> {
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
   * Start server in HTTP mode (for remote deployment)
   */
  private async startHttpMode(): Promise<void> {
    // Create Express app for health/metrics endpoints
    const app = express();
    app.use(express.json());

    // Health check endpoint (liveness probe)
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Readiness check endpoint
    app.get('/ready', (_req, res) => {
      if (this.ready) {
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
      }
    });

    // Basic metrics endpoint
    app.get('/metrics', (_req, res) => {
      res.json({
        requests: this.requestCount,
        errors: this.errorCount,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      });
    });

    // Create MCP transport with session management
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    // Connect server to transport
    await this.server.connect(this.transport);

    // API key authentication middleware
    const authMiddleware = (req: any, res: any, next: any) => {
      if (this.config.apiKey) {
        const authHeader = req.headers['authorization'];
        const apiKey = authHeader?.replace('Bearer ', '');

        if (apiKey !== this.config.apiKey) {
          res.status(401).json({ error: 'Unauthorized: Invalid API key' });
          return;
        }
      }
      next();
    };

    // MCP endpoint - handles all MCP protocol messages
    app.all('/mcp', authMiddleware, async (req, res) => {
      await this.transport!.handleRequest(req, res, req.body);
    });

    // Create HTTP server
    this.httpServer = createServer(app);

    // Start HTTP server
    const port = this.config.port || 3000;
    const host = this.config.host || '0.0.0.0';

    await new Promise<void>((resolve) => {
      this.httpServer.listen(port, host, () => {
        console.error(`PDF Text Extraction MCP Server running on ${host}:${port}`);
        console.error(`MCP endpoint: http://${host}:${port}/mcp`);
        console.error(`Health check: http://${host}:${port}/health`);
        console.error(`Readiness check: http://${host}:${port}/ready`);
        console.error(`Metrics: http://${host}:${port}/metrics`);
        console.error(`Configuration:`, {
          maxFileSize: this.config.maxFileSize,
          timeout: this.config.timeout,
          transportMode: 'http',
          apiKeyEnabled: !!this.config.apiKey,
          bidi: 'always enabled (requires ICU at build time)',
        });
        resolve();
      });
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    this.ready = false;

    // Close MCP server
    await this.server.close();

    // Close transport if running
    if (this.transport) {
      await this.transport.close();
      console.error('MCP transport closed');
    }

    // Close HTTP server if running
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          console.error('HTTP server closed');
          resolve();
        });
      });
    }
  }
}
