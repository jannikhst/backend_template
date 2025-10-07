import { z } from '../extensions/zod';
import { config } from '../config/env';

// ============================================================================
// ERROR CODES - Single Source of Truth
// ============================================================================
// Synchronized with errorHandler.ts and used in OpenAPI specs

export const ERROR_CODES = {
  // Client Errors (4xx)
  VALIDATION_ERROR: { 
    status: 400, 
    message: 'Request validation failed',
    description: 'Bad request (validation error, invalid input)'
  },
  FOREIGN_KEY_CONSTRAINT: { 
    status: 400, 
    message: 'Referenced record does not exist',
    description: 'Bad request (foreign key constraint violation)'
  },
  INVALID_RELATION: { 
    status: 400, 
    message: 'The change would violate a required relation',
    description: 'Bad request (required relation violation)'
  },
  CANNOT_MODIFY_SELF: { 
    status: 400, 
    message: 'Cannot modify own roles or status',
    description: 'Bad request (self-modification not allowed)'
  },
  INVALID_EMAIL_FORMAT: {
    status: 400,
    message: 'Invalid email format',
    description: 'Bad request (invalid email format)'
  },
  INVALID_PROXY: {
    status: 400,
    message: 'Invalid proxy configuration',
    description: 'Bad request (invalid proxy)'
  },
  MISSING_CLOUDFLARE_HEADERS: {
    status: 400,
    message: 'Required Cloudflare headers are missing',
    description: 'Bad request (missing Cloudflare headers)'
  },
  
  AUTHENTICATION_REQUIRED: {
    status: 401, 
    message: 'Authentication required',
    description: 'Authentication required'
  },
  INVALID_TOKEN: { 
    status: 401, 
    message: 'Invalid authentication token',
    description: 'Authentication required (invalid token)'
  },
  INVALID_CREDENTIALS: {
    status: 401,
    message: 'Invalid email or password',
    description: 'Authentication required (invalid credentials)'
  },
  INSUFFICIENT_PERMISSIONS: { 
    status: 403, 
    message: 'Insufficient permissions',
    description: 'Insufficient permissions'
  },
  USER_INACTIVE: { 
    status: 403, 
    message: 'User account is inactive',
    description: 'Insufficient permissions (user account disabled)'
  },
  ACCOUNT_DISABLED: {
    status: 403,
    message: 'Account is disabled',
    description: 'Insufficient permissions (account disabled)'
  },
  DOMAIN_NOT_ALLOWED: {
    status: 403, 
    message: 'Domain not allowed',
    description: 'Insufficient permissions (domain restriction)'
  },
  CANNOT_DELETE_CURRENT_SESSION: {
    status: 400,
    message: 'Cannot delete current session. Use logout endpoint instead.',
    description: 'Bad request (cannot delete current session)'
  },
  RESOURCE_NOT_FOUND: { 
    status: 404, 
    message: 'Resource not found',
    description: 'Resource not found'
  },
  RECORD_NOT_FOUND: { 
    status: 404, 
    message: 'The requested record was not found',
    description: 'Resource not found (database record)'
  },
  ROUTE_NOT_FOUND: { 
    status: 404, 
    message: 'Route not found',
    description: 'Route not found'
  },
  SESSION_NOT_FOUND: {
    status: 404,
    message: 'Session not found or does not belong to current user',
    description: 'Resource not found (session)'
  },
  API_KEY_NOT_FOUND: {
    status: 404,
    message: 'API key not found',
    description: 'Resource not found (API key)'
  },
  DUPLICATE_ENTRY: {
    status: 409, 
    message: 'A record with this data already exists',
    description: 'Conflict (duplicate entry)'
  },
  FILE_TOO_LARGE: { 
    status: 413, 
    message: 'File exceeds maximum size',
    description: 'File too large'
  },
  RATE_LIMIT_EXCEEDED: { 
    status: 429, 
    message: 'Rate limit exceeded',
    description: 'Rate limit exceeded'
  },
  // Server Errors (5xx)
  INTERNAL_ERROR: { 
    status: 500, 
    message: 'Internal server error',
    description: 'Internal server error'
  },
  DATABASE_ERROR: { 
    status: 500, 
    message: 'Database error occurred',
    description: 'Internal server error (database)'
  },
  GOOGLE_LOGIN_FAILED: {
    status: 500,
    message: 'Google login failed',
    description: 'Internal server error (Google authentication)'
  },
  GET_SESSION_FAILED: {
    status: 500,
    message: 'Failed to get session info',
    description: 'Internal server error (session retrieval)'
  },
  LOGOUT_FAILED: {
    status: 500,
    message: 'Logout failed',
    description: 'Internal server error (logout)'
  },
  LOGOUT_ALL_FAILED: {
    status: 500,
    message: 'Logout all sessions failed',
    description: 'Internal server error (logout all)'
  },
  LIST_SESSIONS_FAILED: {
    status: 500,
    message: 'Failed to list sessions',
    description: 'Internal server error (list sessions)'
  },
  DELETE_SESSION_FAILED: {
    status: 500,
    message: 'Failed to delete session',
    description: 'Internal server error (delete session)'
  },
  LIST_USERS_FAILED: {
    status: 500,
    message: 'Failed to list users',
    description: 'Internal server error (list users)'
  },
  UPDATE_USER_ROLES_FAILED: {
    status: 500,
    message: 'Failed to update user roles',
    description: 'Internal server error (update user roles)'
  },
  UPDATE_USER_STATUS_FAILED: {
    status: 500,
    message: 'Failed to update user status',
    description: 'Internal server error (update user status)'
  },
  GET_SYSTEM_STATS_FAILED: {
    status: 500,
    message: 'Failed to get system statistics',
    description: 'Internal server error (system statistics)'
  },
  LIST_LOGS_FAILED: {
    status: 500,
    message: 'Failed to list logs',
    description: 'Internal server error (list logs)'
  },
  GET_LOG_STATS_FAILED: {
    status: 500,
    message: 'Failed to get log statistics',
    description: 'Internal server error (log statistics)'
  },
  CLEANUP_LOGS_FAILED: {
    status: 500,
    message: 'Failed to cleanup logs',
    description: 'Internal server error (cleanup logs)'
  },
  SERVICE_UNAVAILABLE: {
    status: 503, 
    message: 'Service temporarily unavailable',
    description: 'Service temporarily unavailable'
  }
} as const;

// Type inference for error codes
export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// ERROR RESPONSE SCHEMA - Zod + TypeScript Type
// ============================================================================

export const ErrorResponseSchema = z.object({
  status: z.number().openapi({
    description: 'HTTP status code',
    example: 400
  }),
  code: z.string().openapi({
    description: 'Error code',
    example: 'VALIDATION_ERROR'
  }),
  message: z.string().openapi({
    description: 'Error message',
    example: 'Request validation failed'
  }),
  details: z.array(z.object({
    path: z.string().openapi({
      description: 'Field path',
      example: 'email'
    }),
    message: z.string().openapi({
      description: 'Field error message',
      example: 'Invalid email format'
    })
  })).optional().openapi({
    description: 'Detailed validation errors'
  }),
  traceId: z.string().openapi({
    description: 'Request trace ID for debugging',
    example: 'req-1641648000000-abc123'
  })
}).openapi('ErrorResponse');

// Auto-generated TypeScript type from Zod schema
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// SECURITY DEFINITIONS
// ============================================================================

export const SecurityDefinitions = {
  cookieAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: config.SESSION_COOKIE_NAME,
    description: 'Session cookie authentication'
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    description: 'API key authentication via Authorization header. Format: Bearer {username}_{128-hex}'
  }
} as const;

// Security requirement configurations
export const SecurityRequirements = {
  public: [],
  authenticated: [{ cookieAuth: [] }, { bearerAuth: [] }],
  sessionOnly: [{ cookieAuth: [] }],
  apiKeyOnly: [{ bearerAuth: [] }]
} as const;

export type SecurityType = keyof typeof SecurityRequirements;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get security requirement based on type
 */
export function getSecurityRequirement(type: SecurityType = 'authenticated') {
  return SecurityRequirements[type];
}

/**
 * Create error response definition for OpenAPI spec
 */
export function createErrorResponse(errorCode: ErrorCode) {
  const error = ERROR_CODES[errorCode];
  return {
    status: error.status,
    description: error.description,
    content: {
      'application/json': {
        schema: ErrorResponseSchema
      }
    }
  };
}

/**
 * Group error codes by HTTP status code
 */
export function groupErrorsByStatus(errorCodes: ErrorCode[]): Map<number, ErrorCode[]> {
  const grouped = new Map<number, ErrorCode[]>();
  
  for (const code of errorCodes) {
    const status = ERROR_CODES[code].status;
    const existing = grouped.get(status) || [];
    grouped.set(status, [...existing, code]);
  }
  
  return grouped;
}
