import { createRegistry, registerSchemas, registerPath } from '../../core/openapi';
import { 
  ListLogsQuerySchema,
  CleanupLogsRequestSchema,
  ListLogsResponseSchema,
  LogStatsResponseSchema,
  CleanupLogsResponseSchema,
  LogEntrySchema,
  PaginationSchema
} from './schema';

// Create OpenAPI registry for logs module
export const logsOpenApiRegistry = createRegistry();

// Register all schemas
registerSchemas(logsOpenApiRegistry, {
  'ListLogsQuery': ListLogsQuerySchema,
  'CleanupLogsRequest': CleanupLogsRequestSchema,
  'ListLogsResponse': ListLogsResponseSchema,
  'LogStatsResponse': LogStatsResponseSchema,
  'CleanupLogsResponse': CleanupLogsResponseSchema,
  'LogEntry': LogEntrySchema,
  'Pagination': PaginationSchema,
});

// Register OpenAPI paths
registerPath(logsOpenApiRegistry, {
  method: 'get',
  path: '/logs',
  tags: ['Logs'],
  summary: 'List Logs',
  description: 'List system logs with filtering and pagination. Supports filtering by level, service, trace ID, user ID, date range, and text search.',
  response: {
    schema: ListLogsResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'SERVICE_UNAVAILABLE', 'LIST_LOGS_FAILED'],
  rateLimit: 'logs:list',
  request: {
    query: ListLogsQuerySchema
  }
});

registerPath(logsOpenApiRegistry, {
  method: 'get',
  path: '/logs/stats',
  tags: ['Logs'],
  summary: 'Get Log Statistics',
  description: 'Get comprehensive statistics about system logs including counts by level and service, cleanup eligibility, and date ranges.',
  response: {
    schema: LogStatsResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'SERVICE_UNAVAILABLE', 'GET_LOG_STATS_FAILED'],
  rateLimit: 'logs:stats'
});

registerPath(logsOpenApiRegistry, {
  method: 'post',
  path: '/logs/cleanup',
  tags: ['Logs'],
  summary: 'Clean Up Old Logs',
  description: 'Delete old log entries based on age and optionally by log level. This operation is irreversible and should be used with caution.',
  response: {
    schema: CleanupLogsResponseSchema
  },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'CLEANUP_LOGS_FAILED'],
  rateLimit: 'logs:cleanup',
  request: {
    body: CleanupLogsRequestSchema
  }
});
