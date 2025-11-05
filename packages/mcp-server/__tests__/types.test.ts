/**
 * Unit tests for type schemas and validation
 */

import {
  ExtractTextParamsSchema,
  ExtractMetadataParamsSchema,
} from '../src/types';

describe('Type Schemas', () => {
  describe('ExtractTextParamsSchema', () => {
    it('should validate valid parameters', () => {
      const validParams = {
        filePath: '/path/to/document.pdf',
      };

      const result = ExtractTextParamsSchema.parse(validParams);

      expect(result.filePath).toBe('/path/to/document.pdf');
    });

    it('should reject parameters without filePath', () => {
      const invalidParams = {};

      expect(() => ExtractTextParamsSchema.parse(invalidParams)).toThrow();
    });

    it('should reject parameters with wrong types', () => {
      const invalidParams = {
        filePath: 123, // Should be string
      };

      expect(() => ExtractTextParamsSchema.parse(invalidParams)).toThrow();
    });

    it('should accept empty filePath (validation happens at file system level)', () => {
      const params = {
        filePath: '',
      };

      // Zod doesn't reject empty strings by default
      // File existence validation happens at the file system level
      const result = ExtractTextParamsSchema.parse(params);
      expect(result.filePath).toBe('');
    });
  });

  describe('ExtractMetadataParamsSchema', () => {
    it('should validate valid parameters', () => {
      const validParams = {
        filePath: '/path/to/document.pdf',
      };

      const result = ExtractMetadataParamsSchema.parse(validParams);

      expect(result.filePath).toBe('/path/to/document.pdf');
    });

    it('should reject parameters without filePath', () => {
      const invalidParams = {};

      expect(() => ExtractMetadataParamsSchema.parse(invalidParams)).toThrow();
    });

    it('should reject parameters with wrong types', () => {
      const invalidParams = {
        filePath: 123, // Should be string
      };

      expect(() => ExtractMetadataParamsSchema.parse(invalidParams)).toThrow();
    });

    it('should accept empty filePath (validation happens at file system level)', () => {
      const params = {
        filePath: '',
      };

      // Zod doesn't reject empty strings by default
      // File existence validation happens at the file system level
      const result = ExtractMetadataParamsSchema.parse(params);
      expect(result.filePath).toBe('');
    });
  });
});
