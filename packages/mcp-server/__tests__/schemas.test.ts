/**
 * Unit tests for input schemas
 */

import { FilePathParamsSchema, FilePathToolSchema } from '../src/schemas/stdio';
import { FileContentParamsSchema, FileContentToolSchema } from '../src/schemas/http';
import { z } from 'zod';

describe('Input Schemas', () => {
  describe('FilePathParamsSchema (stdio)', () => {
    const schema = z.object(FilePathParamsSchema);

    it('should validate correct file path parameters', () => {
      const validParams = {
        filePath: '/path/to/document.pdf',
      };

      const result = schema.safeParse(validParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should reject missing filePath', () => {
      const invalidParams = {};

      const result = schema.safeParse(invalidParams);

      expect(result.success).toBe(false);
    });

    it('should reject non-string filePath', () => {
      const invalidParams = {
        filePath: 123,
      };

      const result = schema.safeParse(invalidParams);

      expect(result.success).toBe(false);
    });

    it('should have correct properties in FilePathToolSchema', () => {
      expect(FilePathToolSchema.type).toBe('object');
      expect(FilePathToolSchema.properties.filePath.type).toBe('string');
      expect(FilePathToolSchema.required).toContain('filePath');
    });
  });

  describe('FileContentParamsSchema (http)', () => {
    const schema = z.object(FileContentParamsSchema);

    it('should validate correct file content parameters', () => {
      const base64Content = Buffer.from('fake pdf content').toString('base64');
      const validParams = {
        fileContent: base64Content,
      };

      const result = schema.safeParse(validParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    it('should reject missing fileContent', () => {
      const invalidParams = {};

      const result = schema.safeParse(invalidParams);

      expect(result.success).toBe(false);
    });

    it('should reject non-string fileContent', () => {
      const invalidParams = {
        fileContent: 123,
      };

      const result = schema.safeParse(invalidParams);

      expect(result.success).toBe(false);
    });

    it('should accept valid base64 content', () => {
      const base64Samples = [
        'SGVsbG8gV29ybGQ=', // "Hello World"
        'VGVzdA==', // "Test"
        Buffer.from('PDF content here').toString('base64'),
      ];

      base64Samples.forEach((base64) => {
        const result = schema.safeParse({ fileContent: base64 });
        expect(result.success).toBe(true);
      });
    });

    it('should have correct properties in FileContentToolSchema', () => {
      expect(FileContentToolSchema.type).toBe('object');
      expect(FileContentToolSchema.properties.fileContent.type).toBe('string');
      expect(FileContentToolSchema.required).toContain('fileContent');
    });
  });
});
