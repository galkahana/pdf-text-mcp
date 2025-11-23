/**
 * Unit tests for PdfTextMcpServerHttp
 */

import { PdfTextMcpServerHttp } from '../../src/servers/pdf-text-mcp-server-http';
import { ServerConfig } from '../../src/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { createServer } from 'http';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js');
jest.mock('@pdf-text-mcp/pdf-parser');
jest.mock('express');
jest.mock('http');

describe('PdfTextMcpServerHttp', () => {
  const testConfig: ServerConfig = {
    name: 'pdf-text-mcp-server',
    version: '1.0.0',
    maxFileSize: 10485760,
    timeout: 5000,
    transportMode: 'http',
    port: 3000,
    host: '0.0.0.0',
  };

  let mockServer: jest.Mocked<McpServer>;
  let mockExtractor: jest.Mocked<PdfExtractor>;
  let mockTransport: jest.Mocked<StreamableHTTPServerTransport>;
  let mockExpressApp: any;
  let mockHttpServer: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      registerTool: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockExtractor = {
      extractTextFromBuffer: jest.fn(),
      getMetadataFromBuffer: jest.fn(),
    } as any;

    mockTransport = {
      handleRequest: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    } as any;

    mockExpressApp = {
      use: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
    };

    mockHttpServer = {
      listen: jest.fn((_port, _host, callback) => {
        callback();
        return mockHttpServer;
      }),
      close: jest.fn((callback) => callback()),
    };

    (McpServer as jest.Mock).mockImplementation(() => mockServer);
    (PdfExtractor as jest.Mock).mockImplementation(() => mockExtractor);
    (StreamableHTTPServerTransport as jest.Mock).mockImplementation(() => mockTransport);
    (express as unknown as jest.Mock).mockReturnValue(mockExpressApp);
    (express.json as jest.Mock) = jest.fn();
    (createServer as jest.Mock).mockReturnValue(mockHttpServer);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create instance and register tools', () => {
      new PdfTextMcpServerHttp(testConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'extract_text',
        expect.objectContaining({
          description: expect.stringContaining('Extract text content from a PDF base64-encoded content'),
        }),
        expect.any(Function)
      );
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'extract_metadata',
        expect.objectContaining({
          description: expect.stringContaining('Extract metadata from a PDF base64-encoded content'),
        }),
        expect.any(Function)
      );
    });
  });

  describe('start', () => {
    it('should start HTTP server with Express endpoints', async () => {
      const server = new PdfTextMcpServerHttp(testConfig);

      await server.start();

      // Verify Express app setup
      expect(express).toHaveBeenCalled();
      expect(mockExpressApp.use).toHaveBeenCalled();
      expect(mockExpressApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(mockExpressApp.get).toHaveBeenCalledWith('/ready', expect.any(Function));
      expect(mockExpressApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
      expect(mockExpressApp.all).toHaveBeenCalledWith('/mcp', expect.any(Function), expect.any(Function), expect.any(Function));

      // Verify HTTP server started
      expect(createServer).toHaveBeenCalledWith(mockExpressApp);
      expect(mockHttpServer.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));

      // Verify logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('PDF Text Extraction MCP Server running on')
      );
    });

    it('should use default port and host if not specified', async () => {
      const configWithoutPort = { ...testConfig, port: undefined, host: undefined };
      const server = new PdfTextMcpServerHttp(configWithoutPort);

      await server.start();

      expect(mockHttpServer.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));
    });
  });

  describe('stop', () => {
    it('should stop the server gracefully', async () => {
      const server = new PdfTextMcpServerHttp(testConfig);
      await server.start();

      await server.stop();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('PDF Text Extraction MCP Server stopped.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('HTTP server closed');
    });

    it('should handle stop without HTTP server running', async () => {
      const server = new PdfTextMcpServerHttp(testConfig);

      await server.stop();

      expect(mockServer.close).toHaveBeenCalled();
    });
  });

  describe('tool handlers', () => {
    let extractTextHandler: any;
    let extractMetadataHandler: any;

    beforeEach(() => {
      new PdfTextMcpServerHttp(testConfig);
      const registerToolCalls = (mockServer.registerTool as jest.Mock).mock.calls;

      extractTextHandler = registerToolCalls.find(call => call[0] === 'extract_text')[2];
      extractMetadataHandler = registerToolCalls.find(call => call[0] === 'extract_metadata')[2];
    });

    describe('extract_text handler', () => {
      it('should extract text from base64 content successfully', async () => {
        const mockResult = {
          text: 'Sample PDF text',
          pageCount: 1,
          processingTime: 100,
          fileSize: 1024,
        };
        const base64Content = Buffer.from('fake pdf content').toString('base64');
        mockExtractor.extractTextFromBuffer.mockResolvedValue(mockResult);

        const result = await extractTextHandler({ fileContent: base64Content });

        expect(mockExtractor.extractTextFromBuffer).toHaveBeenCalledWith(
          Buffer.from(base64Content, 'base64')
        );
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockResult, null, 2),
            },
          ],
        });
      });

      it('should reject files exceeding max size', async () => {
        const largeContent = Buffer.alloc(20000000).toString('base64'); // 20MB

        await expect(
          extractTextHandler({ fileContent: largeContent })
        ).rejects.toThrow(McpError);

        await expect(
          extractTextHandler({ fileContent: largeContent })
        ).rejects.toMatchObject({
          code: ErrorCode.InvalidRequest,
          message: expect.stringContaining('exceeds maximum'),
        });
      });

      it('should handle extraction errors', async () => {
        const base64Content = Buffer.from('fake pdf content').toString('base64');
        mockExtractor.extractTextFromBuffer.mockRejectedValue(new Error('Extraction failed'));

        await expect(
          extractTextHandler({ fileContent: base64Content })
        ).rejects.toThrow(McpError);

        await expect(
          extractTextHandler({ fileContent: base64Content })
        ).rejects.toMatchObject({
          code: ErrorCode.InternalError,
          message: expect.stringContaining('Tool execution failed'),
        });
      });
    });

    describe('extract_metadata handler', () => {
      it('should extract metadata from base64 content successfully', async () => {
        const mockMetadata = {
          title: 'Test PDF',
          author: 'Test Author',
          pageCount: 5,
        };
        const base64Content = Buffer.from('fake pdf content').toString('base64');
        mockExtractor.getMetadataFromBuffer.mockResolvedValue(mockMetadata);

        const result = await extractMetadataHandler({ fileContent: base64Content });

        expect(mockExtractor.getMetadataFromBuffer).toHaveBeenCalledWith(
          Buffer.from(base64Content, 'base64')
        );
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockMetadata, null, 2),
            },
          ],
        });
      });
    });
  });

  describe('buildFromConfig', () => {
    it('should create PdfTextMcpServerHttp instance', () => {
      const { buildFromConfig } = require('../../src/servers/pdf-text-mcp-server-http');
      const server = buildFromConfig(testConfig);

      expect(server).toBeInstanceOf(PdfTextMcpServerHttp);
    });
  });
});
