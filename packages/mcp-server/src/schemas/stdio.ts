import { z } from 'zod';

// stdio transport schemas - extracting from local file paths

const filePathDescription = 'Path to the PDF file to extract from';

/**
 * Tool schema for file path parameter
 */
export const FilePathToolSchema = {
  type: 'object',
  properties: {
    filePath: {
      type: 'string',
      description: filePathDescription,
    },
  },
  required: ['filePath'],
};

/**
 * Zod schema and type for extract_text and extract_metadata tool parameters
 */

export const FilePathParamsSchema = {
  /** Path to the PDF file to extract from */
  filePath: z.string().describe(filePathDescription),
};

const FilePathParamsSchemaObject = z.object(FilePathParamsSchema);
export type FilePathParamsType = z.infer<typeof FilePathParamsSchemaObject>;
