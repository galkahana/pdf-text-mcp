/**
 * Unit tests for configuration management
 */

import { loadConfig } from '../src/config';
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_TIMEOUT } from '@pdf-text-mcp/pdf-parser';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default configuration', () => {
      const config = loadConfig();

      expect(config.name).toBe('pdf-text-mcp-server');
      expect(config.version).toBe('1.0.0');
      expect(config.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(config.timeout).toBe(DEFAULT_TIMEOUT);
    });

    it('should load MAX_FILE_SIZE from environment', () => {
      process.env.MAX_FILE_SIZE = '52428800'; // 50MB

      const config = loadConfig();

      expect(config.maxFileSize).toBe(52428800);
    });

    it('should load TIMEOUT from environment', () => {
      process.env.TIMEOUT = '60000'; // 60 seconds

      const config = loadConfig();

      expect(config.timeout).toBe(60000);
    });

    it('should handle invalid MAX_FILE_SIZE gracefully', () => {
      process.env.MAX_FILE_SIZE = 'invalid';

      const config = loadConfig();

      // parseInt returns NaN for invalid strings
      expect(isNaN(config.maxFileSize!)).toBe(true);
    });

    it('should handle invalid TIMEOUT gracefully', () => {
      process.env.TIMEOUT = 'invalid';

      const config = loadConfig();

      // parseInt returns NaN for invalid strings
      expect(isNaN(config.timeout!)).toBe(true);
    });
  });
});
