/**
 * Unit tests for BasePdfTextMcpServer abstract class
 */

import { BasePdfTextMcpServer } from '../../src/servers/base-pdf-text-mcp-server';
import { ServerConfig } from '../../src/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PdfExtractor } from '@pdf-text-mcp/pdf-parser';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@pdf-text-mcp/pdf-parser');

// Track calls outside the class to avoid initialization order issues
let setupToolsCallCount = 0;
let startCallCount = 0;
let stopCallCount = 0;

// Concrete test implementation of abstract class
class TestPdfTextMcpServer extends BasePdfTextMcpServer {
  protected setupTools(): void {
    // This will be called by the base constructor
    setupToolsCallCount++;
  }

  async start(): Promise<void> {
    startCallCount++;
  }

  async stop(): Promise<void> {
    stopCallCount++;
  }
}

describe('BasePdfTextMcpServer', () => {
  const testConfig: ServerConfig = {
    name: 'test-server',
    version: '1.0.0',
    maxFileSize: 10485760,
    timeout: 5000,
    transportMode: 'stdio',
  };

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset call counters
    setupToolsCallCount = 0;
    startCallCount = 0;
    stopCallCount = 0;

    // Mock McpServer and PdfExtractor before instantiation
    (McpServer as jest.Mock).mockImplementation(() => ({}));
    (PdfExtractor as jest.Mock).mockImplementation(() => ({}));

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize server with correct configuration', () => {
      new TestPdfTextMcpServer(testConfig);

      expect(McpServer).toHaveBeenCalledWith(
        {
          name: 'test-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      expect(PdfExtractor).toHaveBeenCalledWith({
        maxFileSize: 10485760,
        timeout: 5000,
      });

      expect(setupToolsCallCount).toBe(1);
    });

    it('should call setupTools during construction', () => {
      new TestPdfTextMcpServer(testConfig);
      expect(setupToolsCallCount).toBe(1);
    });
  });

  describe('logConfiguration', () => {
    it('should log stdio configuration correctly', () => {
      const server = new TestPdfTextMcpServer(testConfig);

      // Call protected method through subclass
      (server as any).logConfiguration('stdio');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Configuration:', {
        maxFileSize: 10485760,
        timeout: 5000,
        transportMode: 'stdio',
        bidi: 'always enabled (requires ICU at build time)',
      });
    });

    it('should log http configuration with additional info', () => {
      const httpConfig: ServerConfig = { ...testConfig, transportMode: 'http' };
      const server = new TestPdfTextMcpServer(httpConfig);

      (server as any).logConfiguration('http', { apiKeyEnabled: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Configuration:', {
        maxFileSize: 10485760,
        timeout: 5000,
        transportMode: 'http',
        bidi: 'always enabled (requires ICU at build time)',
        apiKeyEnabled: true,
      });
    });
  });

  describe('abstract methods', () => {
    it('should require implementation of setupTools', () => {
      new TestPdfTextMcpServer(testConfig);
      expect(setupToolsCallCount).toBe(1);
    });

    it('should require implementation of start', async () => {
      const server = new TestPdfTextMcpServer(testConfig);
      await server.start();
      expect(startCallCount).toBe(1);
    });

    it('should require implementation of stop', async () => {
      const server = new TestPdfTextMcpServer(testConfig);
      await server.stop();
      expect(stopCallCount).toBe(1);
    });
  });

  describe('config storage', () => {
    it('should store config for subclass access', () => {
      const server = new TestPdfTextMcpServer(testConfig);
      expect((server as any).config).toEqual(testConfig);
    });
  });
});
