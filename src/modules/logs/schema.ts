import { z } from '../../core/extensions/zod';

// Schema for listing logs with filters
export const ListLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ 
    example: 1, 
    description: 'Page number for pagination' 
  }),
  pageSize: z.coerce.number().int().min(1).max(200).default(50).openapi({ 
    example: 50, 
    description: 'Number of items per page (max 200)' 
  }),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional().openapi({ 
    example: 'error', 
    description: 'Filter by log level' 
  }),
  service: z.string().optional().openapi({ 
    example: 'admin-backend', 
    description: 'Filter by service name' 
  }),
  traceId: z.string().optional().openapi({ 
    example: 'req-123', 
    description: 'Filter by trace ID for request correlation' 
  }),
  userId: z.uuid().optional().openapi({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'Filter by user ID' 
  }),
  startDate: z.coerce.date().optional().openapi({ 
    example: '2025-08-01T00:00:00Z', 
    description: 'Filter logs after this date (ISO 8601)' 
  }),
  endDate: z.coerce.date().optional().openapi({ 
    example: '2025-08-10T23:59:59Z', 
    description: 'Filter logs before this date (ISO 8601)' 
  }),
  search: z.string().optional().openapi({ 
    example: 'database error', 
    description: 'Search in log messages (case-insensitive)' 
  }),
}).openapi('ListLogsQuery');

// Schema for log cleanup (admin only)
export const CleanupLogsRequestSchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(7).openapi({ 
    example: 7, 
    description: 'Delete logs older than this many days (1-365)' 
  }),
  level: z.enum(['info', 'warn', 'error', 'debug']).optional().openapi({ 
    example: 'debug', 
    description: 'Only delete logs of this level (optional)' 
  }),
}).openapi('CleanupLogsRequest');

// Log entry schema for responses
export const LogEntrySchema = z.object({
  id: z.uuid().openapi({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'Unique log entry identifier' 
  }),
  timestamp: z.iso.datetime().openapi({ 
    example: '2025-08-10T17:30:00Z', 
    description: 'When the log entry was created' 
  }),
  level: z.enum(['info', 'warn', 'error', 'debug']).openapi({ 
    example: 'error', 
    description: 'Log level' 
  }),
  message: z.string().openapi({ 
    example: 'Database connection failed', 
    description: 'Log message' 
  }),
  service: z.string().openapi({ 
    example: 'admin-backend', 
    description: 'Service that generated the log' 
  }),
  environment: z.string().nullable().openapi({ 
    example: 'production', 
    description: 'Environment where the log was generated' 
  }),
  context: z.record(z.string(), z.any()).nullable().openapi({ 
    example: { error: 'Connection timeout', retryCount: 3 }, 
    description: 'Additional context data (JSON)' 
  }),
  traceId: z.string().nullable().openapi({ 
    example: 'req-123', 
    description: 'Request trace ID for correlation' 
  }),
  userId: z.string().nullable().openapi({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'User ID if available in context' 
  }),
}).openapi('LogEntry');

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().openapi({ example: 1, description: 'Current page number' }),
  pageSize: z.number().int().openapi({ example: 50, description: 'Items per page' }),
  totalCount: z.number().int().openapi({ example: 150, description: 'Total number of items' }),
  totalPages: z.number().int().openapi({ example: 3, description: 'Total number of pages' }),
  hasNextPage: z.boolean().openapi({ example: true, description: 'Whether there is a next page' }),
  hasPreviousPage: z.boolean().openapi({ example: false, description: 'Whether there is a previous page' }),
}).openapi('Pagination');

// Response schemas
export const ListLogsResponseSchema = z.object({
  logs: z.array(LogEntrySchema),
  pagination: PaginationSchema,
  filters: z.object({
    level: z.string().optional(),
    service: z.string().optional(),
    traceId: z.string().optional(),
    userId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  }).openapi({ description: 'Applied filters' }),
  timestamp: z.iso.datetime().openapi({ 
    example: '2025-08-10T17:30:00Z', 
    description: 'Response timestamp' 
  }),
}).openapi('ListLogsResponse');

export const LogStatsResponseSchema = z.object({
  summary: z.object({
    totalLogs: z.number().int().openapi({ example: 5420, description: 'Total number of logs' }),
    recentLogs: z.number().int().openapi({ example: 234, description: 'Logs from last 24 hours' }),
    logsOlderThanWeek: z.number().int().openapi({ example: 1200, description: 'Logs older than 7 days' }),
    oldestLogDate: z.iso.datetime().nullable().openapi({ 
      example: '2025-07-15T10:00:00Z', 
      description: 'Date of oldest log entry' 
    }),
    newestLogDate: z.iso.datetime().nullable().openapi({ 
      example: '2025-08-10T17:30:00Z', 
      description: 'Date of newest log entry' 
    }),
  }),
  breakdown: z.object({
    byLevel: z.record(z.string(), z.number().int()).openapi({ 
      example: { info: 3200, warn: 1800, error: 380, debug: 40 }, 
      description: 'Log count by level' 
    }),
    byService: z.record(z.string(), z.number().int()).openapi({ 
      example: { 'admin-backend': 5420 }, 
      description: 'Log count by service' 
    }),
  }),
  cleanup: z.object({
    eligibleForCleanup: z.number().int().openapi({ 
      example: 1200, 
      description: 'Number of logs eligible for cleanup' 
    }),
    cutoffDate: z.iso.datetime().openapi({ 
      example: '2025-08-03T17:30:00Z', 
      description: 'Cutoff date for cleanup (7 days ago)' 
    }),
  }),
  timestamp: z.iso.datetime().openapi({ 
    example: '2025-08-10T17:30:00Z', 
    description: 'Response timestamp' 
  }),
}).openapi('LogStatsResponse');

export const CleanupLogsResponseSchema = z.object({
  message: z.string().openapi({ 
    example: 'Successfully deleted 150 log entries', 
    description: 'Cleanup result message' 
  }),
  deleted: z.number().int().openapi({ 
    example: 150, 
    description: 'Number of log entries deleted' 
  }),
  cutoffDate: z.iso.datetime().openapi({ 
    example: '2025-08-03T17:30:00Z', 
    description: 'Cutoff date used for cleanup' 
  }),
  criteria: z.object({
    olderThanDays: z.number().int().openapi({ example: 7, description: 'Days threshold used' }),
    level: z.string().optional().openapi({ example: 'debug', description: 'Level filter used (if any)' }),
  }),
  timestamp: z.iso.datetime().openapi({ 
    example: '2025-08-10T17:30:00Z', 
    description: 'Response timestamp' 
  }),
}).openapi('CleanupLogsResponse');

export type ListLogsQuery = z.infer<typeof ListLogsQuerySchema>;
export type CleanupLogsRequest = z.infer<typeof CleanupLogsRequestSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ListLogsResponse = z.infer<typeof ListLogsResponseSchema>;
export type LogStatsResponse = z.infer<typeof LogStatsResponseSchema>;
export type CleanupLogsResponse = z.infer<typeof CleanupLogsResponseSchema>;
