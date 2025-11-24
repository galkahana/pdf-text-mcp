/**
 * Prometheus metrics module for PDF Text MCP Server
 *
 * Exposes metrics for monitoring server health, performance, and usage.
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus registry for all metrics
 */
export const register = new Registry();

// Collect default metrics (CPU, memory, event loop lag, etc.)
collectDefaultMetrics({ register, prefix: 'nodejs_' });

/**
 * HTTP request metrics
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/**
 * MCP tool invocation metrics
 */
export const mcpToolInvocations = new Counter({
  name: 'mcp_tool_invocations_total',
  help: 'Total number of MCP tool invocations',
  labelNames: ['tool_name', 'status'],
  registers: [register],
});

export const mcpToolDuration = new Histogram({
  name: 'mcp_tool_execution_duration_seconds',
  help: 'MCP tool execution time in seconds',
  labelNames: ['tool_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

/**
 * PDF processing metrics
 */
export const pdfFileSize = new Histogram({
  name: 'pdf_file_size_bytes',
  help: 'Size of processed PDF files in bytes',
  labelNames: ['tool_name'],
  buckets: [1000, 10000, 100000, 1000000, 10000000, 50000000],
  registers: [register],
});

export const pdfPageCount = new Histogram({
  name: 'pdf_page_count',
  help: 'Number of pages in processed PDFs',
  labelNames: ['tool_name'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

export const pdfProcessingDuration = new Histogram({
  name: 'pdf_processing_duration_seconds',
  help: 'Time spent in native PDF processing (C++ addon)',
  labelNames: ['tool_name'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/**
 * Error metrics
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'tool_name'],
  registers: [register],
});

/**
 * System metrics
 */
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

export const cpuUsage = new Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register],
});

export const serverUptime = new Gauge({
  name: 'server_uptime_seconds',
  help: 'Server uptime in seconds',
  registers: [register],
});

/**
 * Update system metrics
 */
export function updateSystemMetrics(): void {
  const mem = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, mem.rss);
  memoryUsage.set({ type: 'heapTotal' }, mem.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, mem.heapUsed);
  memoryUsage.set({ type: 'external' }, mem.external);

  const usage = process.cpuUsage();
  const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
  cpuUsage.set(totalUsage / process.uptime());

  serverUptime.set(process.uptime());
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  durationSeconds: number
): void {
  httpRequestsTotal.inc({ method, path, status_code: statusCode });
  httpRequestDuration.observe({ method, path, status_code: statusCode }, durationSeconds);
}

/**
 * Record MCP tool invocation metrics
 */
export function recordToolInvocation(
  toolName: string,
  status: 'success' | 'error',
  durationSeconds: number,
  metadata?: {
    fileSize?: number;
    pageCount?: number;
    processingTime?: number;
  }
): void {
  mcpToolInvocations.inc({ tool_name: toolName, status });
  mcpToolDuration.observe({ tool_name: toolName }, durationSeconds);

  if (metadata) {
    if (metadata.fileSize !== undefined) {
      pdfFileSize.observe({ tool_name: toolName }, metadata.fileSize);
    }
    if (metadata.pageCount !== undefined) {
      pdfPageCount.observe({ tool_name: toolName }, metadata.pageCount);
    }
    if (metadata.processingTime !== undefined) {
      pdfProcessingDuration.observe({ tool_name: toolName }, metadata.processingTime / 1000);
    }
  }
}

/**
 * Record error metrics
 */
export function recordError(errorType: string, toolName?: string): void {
  errorsTotal.inc({ error_type: errorType, tool_name: toolName || 'unknown' });
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  updateSystemMetrics();
  return register.metrics();
}

export default {
  register,
  getMetrics,
  recordHttpRequest,
  recordToolInvocation,
  recordError,
  updateSystemMetrics,
};
