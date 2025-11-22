/**
 * MCP Server Implementation for PDF Text Extraction over WebSocket.
 */
import { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { ServerConfig } from '../types';
import { FileContentParamsSchema, FileContentParamsType } from '../schemas/http';
import { PDFTextMcpServer } from './pdf-text-mcp-server';

import express from 'express';
import { createServer } from 'http';

export class PdfTextMcpServerHttp implements PDFTextMcpServer {
  private server: McpServer;
  private extractor: PdfExtractor;
  private config: ServerConfig;

  private requestCount: number = 0;
  private errorCount: number = 0;
  private httpServer?: any;
  private ready: boolean = false;

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

    this.setupTools();
  }


  private setupTools(): void {
    this.server.registerTool(
      'extract_text',
      {
        description: 'Extract text content from a PDF base64-encoded content. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide fileContent (base64-encoded PDF)',
        inputSchema: FileContentParamsSchema,
      },
      this.createFileContentOperationHandler((fileContent: Buffer) =>
        this.extractor.extractTextFromBuffer(fileContent)
      )
    )

    this.server.registerTool(
      'extract_metadata',
      {
        description: 'Extract metadata from a PDF base64-encoded content including title, author, subject, creator, producer, dates, page count, and version. Provide fileContent (base64-encoded PDF)',
        inputSchema: FileContentParamsSchema,
      },
      this.createFileContentOperationHandler((fileContent: Buffer) =>
        this.extractor.getMetadataFromBuffer(fileContent)
      ),
    );
  }

  private createFileContentOperationHandler<T>(
      operation: (fileContent: Buffer) => Promise<T>
    ): ToolCallback<typeof FileContentParamsSchema> {
    return async (args: FileContentParamsType) => {
      try {
        // Validate parameters
        const { fileContent } = args;

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
   * Start the MCP server
   * This connects the server to stdio or HTTP transport depending on configuration
   */
  async start(): Promise<void> {
    // Create Express app for health/metrics endpoints
    const app = express();
    // Increase body size limit for base64-encoded PDFs (default is 100kb)
    app.use(express.json({ limit: '50mb' }));

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

    // Request tracking middleware for MCP endpoint
    const mcpTrackingMiddleware = async (_req: any, res: any, next: any) => {
      this.requestCount++;
      
      try {
        await next();
        
        // Track errors based on HTTP status code
        if (res.statusCode >= 400) {
          this.errorCount++;
        }
      } catch (error) {
        this.errorCount++;
        throw error;
      }
    };

    // MCP endpoint - handles all MCP protocol messages
    app.all('/mcp', mcpTrackingMiddleware, authMiddleware, async (req, res) => {
      // In stateless mode, create a new transport for each request to prevent
      // request ID collisions. Different clients may use the same JSON-RPC request
      // IDs, which would cause responses to be routed to the wrong HTTP connections
      // if the transport state is shared.
      const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
      });

      res.on('close', () => {
          transport.close();
      });

      await this.server.connect(transport);
      await transport.handleRequest(req, res, req.body);
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
