import { z } from 'zod';

// http transport schemas - extracting from pdf file content

const fileContentDescription = 'Base64-encoded PDF content to extract from';

/**
 * Tool schema for file content parameter
 */
export const FileContentToolSchema = {
  type: 'object',
  properties: {
    fileContent: {
      type: 'string',
      description: fileContentDescription,
    },
  },
  required: ['fileContent'],
};

/**
 * Zod schema and type for extract_text and extract_metadata tool parameters
 */
export const FileContentParamsSchema = z.object({
  /** Base64-encoded PDF content to extract from */
  fileContent: z.string().describe(fileContentDescription),
});

export type FileContentParams = z.infer<typeof FileContentParamsSchema>;
