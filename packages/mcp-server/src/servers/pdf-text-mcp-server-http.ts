/**
 * MCP Server Implementation for PDF Text Extraction over WebSocket.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { ServerConfig } from '../types';
import { FileContentParamsSchema, FileContentToolSchema } from '../schemas/http';
import { PDFTextMcpServer, ToolDefinition } from './pdf-text-mcp-server';

import express from 'express';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

export class PdfTextMcpServerHttp implements PDFTextMcpServer {
  private server: Server;
  private extractor: PdfExtractor;
  private config: ServerConfig;
  private requestCount: number = 0;
  private errorCount: number = 0;

  private httpServer?: any;
  private transport?: StreamableHTTPServerTransport;
  private ready: boolean = false;

  private tools: Record<string, ToolDefinition> = {
    extract_text: {
      description:
        'Extract text content from a PDF base64-encoded content. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide fileContent (base64-encoded PDF)',
      inputSchema: FileContentToolSchema,
      implementation: this.createFileContentOperationHandler(fileContent =>
        this.extractor.extractTextFromBuffer(fileContent)
      ),
    },
    extract_metadata: {
      description:
        'Extract metadata from a PDF base64-encoded content including title, author, subject, creator, producer, dates, page count, and version. Provide fileContent (base64-encoded PDF)',
      inputSchema: FileContentToolSchema,
      implementation: this.createFileContentOperationHandler(fileContent =>
        this.extractor.getMetadataFromBuffer(fileContent)
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

  private createFileContentOperationHandler<T>(operation: (fileContent: Buffer) => Promise<T>): (
    args: unknown
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    return async (args: unknown) => {
      // Validate parameters
      const { fileContent } = FileContentParamsSchema.parse(args);

      // Decode base64 content to buffer
      const buffer = Buffer.from(fileContent, 'base64');

      // Check file size
      if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `File size (${buffer.length} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`
        );
      }

      // Execute the operation
      const result = await operation(buffer);

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

    await new Promise<void>(resolve => {
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

    // Mark as ready
    this.ready = true;
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    this.ready = false;

    // Close MCP server
    await this.server.close();
    console.error('PDF Text Extraction MCP Server stopped.');

    // Close transport if running
    if (this.transport) {
      await this.transport.close();
      console.error('MCP transport closed');
    }

    // Close HTTP server if running
    if (this.httpServer) {
      await new Promise<void>(resolve => {
        this.httpServer.close(() => {
          console.error('HTTP server closed');
          resolve();
        });
      });
    }
  }
}

export function buildFromConfig(config: ServerConfig): PDFTextMcpServer {
  return new PdfTextMcpServerHttp(config);
}
