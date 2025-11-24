/**
 * Structured logging module for PDF Text MCP Server
 *
 * Provides JSON-formatted logging with correlation IDs for request tracing.
 * Logs are written to stdout for collection by Promtail/Loki.
 */

import winston from 'winston';
import { randomUUID } from 'crypto';

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  correlationId?: string;
  toolName?: string;
  fileSize?: number;
  pageCount?: number;
  processingTime?: number;
  errorType?: string;
  statusCode?: number;
  method?: string;
  path?: string;
  [key: string]: any;
}

/**
 * Winston logger configured for production use
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'pdf-text-mcp-server',
  },
  transports: [
    // Write all logs to stdout (collected by Promtail)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

/**
 * Generate a new correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Log an info message with optional context
 */
export function info(message: string, context?: LogContext): void {
  logger.info(message, context);
}

/**
 * Log a warning message with optional context
 */
export function warn(message: string, context?: LogContext): void {
  logger.warn(message, context);
}

/**
 * Log an error message with optional context
 */
export function error(message: string, error?: Error, context?: LogContext): void {
  logger.error(message, {
    ...context,
    error: error ? { message: error.message, stack: error.stack } : undefined,
  });
}

/**
 * Log a debug message with optional context
 */
export function debug(message: string, context?: LogContext): void {
  logger.debug(message, context);
}

/**
 * Create a child logger with default context
 */
export function createChildLogger(defaultContext: LogContext): {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
} {
  return {
    info: (message: string, context?: LogContext) =>
      info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      warn(message, { ...defaultContext, ...context }),
    error: (message: string, err?: Error, context?: LogContext) =>
      error(message, err, { ...defaultContext, ...context }),
    debug: (message: string, context?: LogContext) =>
      debug(message, { ...defaultContext, ...context }),
  };
}

export default {
  info,
  warn,
  error,
  debug,
  generateCorrelationId,
  createChildLogger,
};
