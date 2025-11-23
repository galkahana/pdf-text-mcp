/**
 * Unit tests for PdfTextMcpServerStdio
 */

import { PdfTextMcpServerStdio } from '../../src/servers/pdf-text-mcp-server-stdio';
import { ServerConfig } from '../../src/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('@pdf-text-mcp/pdf-parser');
jest.mock('fs/promises');

describe('PdfTextMcpServerStdio', () => {
  const testConfig: ServerConfig = {
    name: 'pdf-text-mcp-server',
    version: '1.0.0',
    maxFileSize: 10485760,
    timeout: 5000,
    transportMode: 'stdio',
  };

  let mockServer: jest.Mocked<McpServer>;
  let mockExtractor: jest.Mocked<PdfExtractor>;
  let mockTransport: jest.Mocked<StdioServerTransport>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      registerTool: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockExtractor = {
      extractText: jest.fn(),
      getMetadata: jest.fn(),
    } as any;

    mockTransport = {} as any;

    (McpServer as jest.Mock).mockImplementation(() => mockServer);
    (PdfExtractor as jest.Mock).mockImplementation(() => mockExtractor);
    (StdioServerTransport as jest.Mock).mockImplementation(() => mockTransport);
    (fs.access as jest.Mock).mockResolvedValue(undefined);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create instance and register tools', () => {
      new PdfTextMcpServerStdio(testConfig);

      expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'extract_text',
        expect.objectContaining({
          description: expect.stringContaining('Extract text content from a PDF file'),
        }),
        expect.any(Function)
      );
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'extract_metadata',
        expect.objectContaining({
          description: expect.stringContaining('Extract metadata from a PDF file'),
        }),
        expect.any(Function)
      );
    });
  });

  describe('start', () => {
    it('should connect to stdio transport and log configuration', async () => {
      const server = new PdfTextMcpServerStdio(testConfig);

      await server.start();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'PDF Text Extraction MCP Server running on stdio'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Configuration:',
        expect.objectContaining({
          transportMode: 'stdio',
          bidi: 'always enabled (requires ICU at build time)',
        })
      );
    });
  });

  describe('stop', () => {
    it('should close the server gracefully', async () => {
      const server = new PdfTextMcpServerStdio(testConfig);

      await server.stop();

      expect(mockServer.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'PDF Text Extraction MCP Server stopped.'
      );
    });
  });

  describe('tool handlers', () => {
    let extractTextHandler: any;
    let extractMetadataHandler: any;

    beforeEach(() => {
      new PdfTextMcpServerStdio(testConfig);
      const registerToolCalls = (mockServer.registerTool as jest.Mock).mock.calls;

      extractTextHandler = registerToolCalls.find(call => call[0] === 'extract_text')[2];
      extractMetadataHandler = registerToolCalls.find(call => call[0] === 'extract_metadata')[2];
    });

    describe('extract_text handler', () => {
      it('should extract text successfully', async () => {
        const mockResult = {
          text: 'Sample PDF text',
          pageCount: 1,
          processingTime: 100,
          fileSize: 1024,
        };
        mockExtractor.extractText.mockResolvedValue(mockResult);

        const result = await extractTextHandler({ filePath: '/test/file.pdf' }, {});

        expect(fs.access).toHaveBeenCalledWith('/test/file.pdf');
        expect(mockExtractor.extractText).toHaveBeenCalledWith('/test/file.pdf');
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockResult, null, 2),
            },
          ],
        });
      });

      it('should throw McpError if file not found', async () => {
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await expect(
          extractTextHandler({ filePath: '/nonexistent.pdf' }, {})
        ).rejects.toThrow(McpError);

        await expect(
          extractTextHandler({ filePath: '/nonexistent.pdf' }, {})
        ).rejects.toMatchObject({
          code: ErrorCode.InvalidRequest,
          message: expect.stringContaining('File not found'),
        });
      });

      it('should handle extraction errors', async () => {
        mockExtractor.extractText.mockRejectedValue(new Error('Extraction failed'));

        await expect(
          extractTextHandler({ filePath: '/test/file.pdf' }, {})
        ).rejects.toThrow(McpError);

        await expect(
          extractTextHandler({ filePath: '/test/file.pdf' }, {})
        ).rejects.toMatchObject({
          code: ErrorCode.InternalError,
          message: expect.stringContaining('Tool execution failed'),
        });
      });
    });

    describe('extract_metadata handler', () => {
      it('should extract metadata successfully', async () => {
        const mockMetadata = {
          title: 'Test PDF',
          author: 'Test Author',
          pageCount: 5,
        };
        mockExtractor.getMetadata.mockResolvedValue(mockMetadata);

        const result = await extractMetadataHandler({ filePath: '/test/file.pdf' }, {});

        expect(fs.access).toHaveBeenCalledWith('/test/file.pdf');
        expect(mockExtractor.getMetadata).toHaveBeenCalledWith('/test/file.pdf');
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockMetadata, null, 2),
            },
          ],
        });
      });

      it('should throw McpError if file not found', async () => {
        (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

        await expect(
          extractMetadataHandler({ filePath: '/nonexistent.pdf' }, {})
        ).rejects.toThrow(McpError);
      });
    });
  });

  describe('buildFromConfig', () => {
    it('should create PdfTextMcpServerStdio instance', () => {
      const { buildFromConfig } = require('../../src/servers/pdf-text-mcp-server-stdio');
      const server = buildFromConfig(testConfig);

      expect(server).toBeInstanceOf(PdfTextMcpServerStdio);
    });
  });
});
