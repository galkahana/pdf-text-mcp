/*
 * PDF Text Extraction MCP Server
 *
 *  Exposes two tools that the AI can call:
 *  1. extract_text - Extract text content from a PDF file
 *  2. extract_metadata - Extract metadata (title, author, dates, etc.) from a PDF file
 *
 */

export interface PDFTextMcpServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}
