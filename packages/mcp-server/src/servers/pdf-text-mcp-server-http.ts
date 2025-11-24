/**
 * MCP Server Implementation for PDF Text Extraction over HTTP.
 */
import { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { ServerConfig } from '../types';
import { FileContentParamsSchema, FileContentParamsType } from '../schemas/http';
import { PDFTextMcpServer } from './pdf-text-mcp-server';
import { BasePdfTextMcpServer } from './base-pdf-text-mcp-server';
import * as logger from '../logger';
import * as metrics from '../metrics';

import express from 'express';
import { createServer } from 'http';

export class PdfTextMcpServerHttp extends BasePdfTextMcpServer {
  private requestCount: number = 0;
  private errorCount: number = 0;
  private httpServer?: any;
  private ready: boolean = false;

  constructor(config: ServerConfig) {
    super(config);
  }

  protected setupTools(): void {
    this.server.registerTool(
      'extract_text',
      {
        description:
          'Extract text content from a PDF base64-encoded content. Bidirectional text (Hebrew, Arabic, etc.) is always supported. Returns the extracted text, page count, and processing metadata. Provide fileContent (base64-encoded PDF)',
        inputSchema: FileContentParamsSchema,
      },
      this.createFileContentOperationHandler((fileContent: Buffer) =>
        this.extractor.extractTextFromBuffer(fileContent)
      )
    );

    this.server.registerTool(
      'extract_metadata',
      {
        description:
          'Extract metadata from a PDF base64-encoded content including title, author, subject, creator, producer, dates, page count, and version. Provide fileContent (base64-encoded PDF)',
        inputSchema: FileContentParamsSchema,
      },
      this.createFileContentOperationHandler((fileContent: Buffer) =>
        this.extractor.getMetadataFromBuffer(fileContent)
      )
    );
  }

  private createFileContentOperationHandler<T>(
    operation: (fileContent: Buffer) => Promise<T>
  ): ToolCallback<typeof FileContentParamsSchema> {
    return async (args: FileContentParamsType) => {
      const correlationId = logger.generateCorrelationId();
      const startTime = Date.now();
      const toolName = operation.name.includes('Metadata') ? 'extract_metadata' : 'extract_text';

      try {
        // Validate parameters
        const { fileContent } = args;

        // Decode base64 content to buffer
        const buffer = Buffer.from(fileContent, 'base64');
        const fileSize = buffer.length;

        logger.info('Tool request received', {
          correlationId,
          toolName,
          fileSize,
        });

        // Check file size
        if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
          logger.warn('File size exceeds maximum', {
            correlationId,
            toolName,
            fileSize: buffer.length,
            maxFileSize: this.config.maxFileSize,
          });
          throw new McpError(
            ErrorCode.InvalidRequest,
            `File size (${buffer.length} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`
          );
        }

        // Execute the operation
        const result = await operation(buffer);
        const processingTime = Date.now() - startTime;

        // Extract page count if available
        const pageCount =
          typeof result === 'object' && result !== null && 'pageCount' in result
            ? (result as any).pageCount
            : undefined;

        logger.info('Tool request completed', {
          correlationId,
          toolName,
          fileSize,
          pageCount,
          processingTime,
        });

        // Record metrics
        metrics.recordToolInvocation(toolName, 'success', processingTime / 1000, {
          fileSize,
          pageCount,
          processingTime,
        });

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
        const processingTime = Date.now() - startTime;

        if (error instanceof McpError) {
          logger.error('Tool request failed (MCP error)', error, {
            correlationId,
            toolName,
            errorType: 'McpError',
            processingTime,
          });
          metrics.recordToolInvocation(toolName, 'error', processingTime / 1000);
          metrics.recordError('McpError', toolName);
          throw error;
        }

        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Tool request failed', err, {
          correlationId,
          toolName,
          errorType: err.name,
          processingTime,
        });
        metrics.recordToolInvocation(toolName, 'error', processingTime / 1000);
        metrics.recordError(err.name, toolName);

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };
  }

  /**
   * Start the MCP server with HTTP transport.
   */
  async start(): Promise<void> {
    // Create HTTP server
    this.httpServer = this.createHTTPServer();

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
        this.logConfiguration('http', { apiKeyEnabled: !!this.config.apiKey });

        logger.info('Server started', {
          host,
          port,
          transportMode: 'http',
          apiKeyEnabled: !!this.config.apiKey,
        });

        resolve();
      });
    });

    // Mark as ready
    this.ready = true;
  }

  private createHTTPServer() {
    // Create Express app for health/metrics endpoints
    const app = express();
    // Increase body size limit for base64-encoded PDFs (default is 100kb)
    app.use(express.json({ limit: '50mb' }));

    // Request logging and metrics middleware
    app.use((req, res, next) => {
      const startTime = Date.now();
      const originalEnd = res.end.bind(res);

      res.end = function (this: any, ...args: any[]): any {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = res.statusCode;

        // Record HTTP metrics
        metrics.recordHttpRequest(req.method, req.path, statusCode, duration);

        // Log HTTP request
        logger.info('HTTP request', {
          method: req.method,
          path: req.path,
          statusCode,
          duration: duration * 1000,
        });

        return originalEnd(...args);
      };

      next();
    });

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

    // Prometheus metrics endpoint
    app.get('/metrics', async (_req, res) => {
      try {
        res.set('Content-Type', metrics.register.contentType);
        const metricsData = await metrics.getMetrics();
        res.send(metricsData);
      } catch (error) {
        res.status(500).send('Error generating metrics');
      }
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
        enableJsonResponse: true,
      });

      res.on('close', () => {
        transport.close();
      });

      await this.server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    return createServer(app);
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
      await new Promise<void>((resolve) => {
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
