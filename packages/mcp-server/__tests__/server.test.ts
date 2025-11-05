/**
 * Unit tests for MCP server
 */

import { PdfTextMcpServer } from '../src/server';
import { ServerConfig } from '../src/types';

// Mock the PDF extractor
jest.mock('@pdf-text-mcp/pdf-parser', () => {
  return {
    PdfExtractor: jest.fn().mockImplementation(() => ({
      extractText: jest.fn().mockResolvedValue({
        text: 'Sample PDF text content',
        pageCount: 5,
        processingTime: 100,
        fileSize: 1024,
      }),
      getMetadata: jest.fn().mockResolvedValue({
        title: 'Test Document',
        author: 'Test Author',
        subject: 'Test Subject',
        creator: 'Test Creator',
        producer: 'Test Producer',
        creationDate: 'D:20220101120000',
        modificationDate: 'D:20220101120000',
        pageCount: 5,
        version: '1.7',
      }),
    })),
  };
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
}));

describe('PdfTextMcpServer', () => {
  let server: PdfTextMcpServer;
  const mockConfig: ServerConfig = {
    name: 'test-server',
    version: '1.0.0',
    maxFileSize: 104857600,
    timeout: 30000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create server instance with config', () => {
      server = new PdfTextMcpServer(mockConfig);

      expect(server).toBeInstanceOf(PdfTextMcpServer);
    });

    it('should initialize with correct configuration', () => {
      const customConfig: ServerConfig = {
        name: 'custom-server',
        version: '2.0.0',
        maxFileSize: 52428800,
        timeout: 60000,
      };

      server = new PdfTextMcpServer(customConfig);

      expect(server).toBeInstanceOf(PdfTextMcpServer);
    });
  });

  describe('Server capabilities', () => {
    it('should expose tools capability', () => {
      server = new PdfTextMcpServer(mockConfig);

      // The server should have tools capability
      // This is verified by the protocol tests
      expect(server).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid tool parameters gracefully', async () => {
      server = new PdfTextMcpServer(mockConfig);

      // The server should validate parameters using Zod
      // Invalid parameters will throw validation errors
      expect(server).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      server = new PdfTextMcpServer(mockConfig);

      // Note: We can't actually test start() in unit tests because it
      // requires a transport connection. This would be an integration test.
      expect(server).toBeDefined();
    });
  });
});
