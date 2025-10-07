import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from '../extensions/zod';
import type { z as zod } from 'zod';
import { UserRole } from '@prisma/client';

type ZodSchema = zod.ZodTypeAny;
import { 
  ErrorCode, 
  ErrorResponseSchema, 
  getSecurityRequirement, 
  createErrorResponse,
  SecurityType 
} from './definitions';

// Re-export everything from definitions for convenience
export * from './definitions';

// ============================================================================
// REGISTRY CREATION
// ============================================================================

/**
 * Create a new OpenAPI registry with common schemas registered
 */
export function createRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();
  
  // Register common error response schema
  registry.register('ErrorResponse', ErrorResponseSchema);
  
  return registry;
}

// ============================================================================
// PATH REGISTRATION - Main API
// ============================================================================

export interface RegisterPathConfig {
  // HTTP method and path
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  
  // Documentation
  tags: string[];
  summary: string;
  description?: string;
  
  // Success response (required)
  response: {
    status?: number;  // Default: 200 for GET/PUT/PATCH/DELETE, 201 for POST
    schema: ZodSchema;
    description?: string;
  };
  
  // Error responses
  errors?: ErrorCode[];  // Predefined error codes
  customErrors?: {       // Custom error responses for non-standard status codes
    [statusCode: number]: {
      description: string;
      schema?: ZodSchema;
    };
  };
  
  // Security & Authorization
  security?: SecurityType;  // Default: 'authenticated'
  requiredRoles?: UserRole[];  // Automatically adds role requirement to description
  
  // Rate limiting
  rateLimit?: string;  // Tag reference to a registered rate limiter
  
  // Request schemas
  request?: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
  };
}

/**
 * Register a path in the OpenAPI registry with automatic error response handling
 * 
 * @example
 * registerPath(registry, {
 *   method: 'post',
 *   path: '/api-keys',
 *   tags: ['ApiKeys'],
 *   summary: 'Create API Key',
 *   response: {
 *     status: 201,
 *     schema: CreateApiKeyResponseSchema
 *   },
 *   errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED'],
 *   rateLimit: 'createApiKey',  // References a tagged rate limiter
 *   security: 'sessionOnly',
 *   request: {
 *     body: CreateApiKeyRequestSchema
 *   }
 * });
 */
export function registerPath(registry: OpenAPIRegistry, config: RegisterPathConfig): void {
  const {
    method,
    path,
    tags,
    summary,
    description,
    response,
    errors = [],
    customErrors = {},
    security = 'authenticated',
    requiredRoles = [],
    rateLimit,
    request
  } = config;

  // Determine default status code based on method
  const defaultStatus = method === 'post' ? 201 : 200;
  const successStatus = response.status ?? defaultStatus;

  // Build description with role requirements and rate limits if specified
  let enhancedDescription = description || summary;
  
  if (requiredRoles.length > 0) {
    const roleText = formatRoleRequirement(requiredRoles);
    enhancedDescription += ` **Requires ${roleText} role${requiredRoles.length > 1 ? 's' : ''}.**`;
  }
  
  if (rateLimit) {
    const rateLimitText = formatRateLimit(rateLimit);
    if (rateLimitText) {
      enhancedDescription += ` ${rateLimitText}`;
    }
  }

  // Build responses object
  const responses: any = {
    [successStatus]: {
      description: response.description || (successStatus === 201 ? 'Resource created successfully' : 'Request successful'),
      content: {
        'application/json': {
          schema: response.schema
        }
      }
    }
  };

  // Add predefined error responses
  const errorCodes = [...errors];
  
  // Automatically add RATE_LIMIT_EXCEEDED if rate limit is specified
  if (rateLimit && !errorCodes.includes('RATE_LIMIT_EXCEEDED')) {
    errorCodes.push('RATE_LIMIT_EXCEEDED');
  }
  
  for (const errorCode of errorCodes) {
    const errorResponse = createErrorResponse(errorCode);
    const { status, ...responseWithoutStatus } = errorResponse;
    
    // If multiple errors share the same status code, combine their descriptions
    if (responses[status]) {
      responses[status].description += ` | ${responseWithoutStatus.description}`;
    } else {
      responses[status] = responseWithoutStatus;
    }
  }

  // Add custom error responses
  for (const [statusCode, errorConfig] of Object.entries(customErrors)) {
    responses[statusCode] = {
      description: errorConfig.description,
      content: {
        'application/json': {
          schema: errorConfig.schema || ErrorResponseSchema
        }
      }
    };
  }

  // Build path config
  const pathConfig: any = {
    method,
    path,
    tags,
    summary,
    description: enhancedDescription,
    security: getSecurityRequirement(security),
    responses
  };

  // Add request schemas if provided
  if (request) {
    pathConfig.request = {};

    if (request.params) {
      pathConfig.request.params = request.params;
    }

    if (request.query) {
      pathConfig.request.query = request.query;
    }

    if (request.body) {
      pathConfig.request.body = {
        content: {
          'application/json': {
            schema: request.body
          }
        }
      };
    }
  }

  registry.registerPath(pathConfig);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format role requirements for description
 */
function formatRoleRequirement(roles: UserRole[]): string {
  if (roles.length === 1) {
    return roles[0];
  }
  if (roles.length === 2) {
    return `${roles[0]} or ${roles[1]}`;
  }
  return `${roles.slice(0, -1).join(', ')} or ${roles[roles.length - 1]}`;
}

/**
 * Format rate limit information for description
 */
function formatRateLimit(tag: string): string | null {
  // Import getRateLimitConfig dynamically to avoid circular dependency
  const { getRateLimitConfig } = require('../http/middleware/rateLimit');
  const config = getRateLimitConfig(tag);
  
  if (!config) {
    return null;
  }
  
  // Convert windowMs to human-readable format
  const minutes = Math.floor(config.windowMs / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  
  let timeWindow: string;
  if (hours >= 1 && minutes % 60 === 0) {
    timeWindow = hours === 1 ? '1 hour' : `${hours} hours`;
  } else {
    timeWindow = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  
  return `\n**Rate limit: ${config.max} requests per ${timeWindow}.**`;
}

/**
 * Helper to create path parameters object from Zod schema fields
 */
export function pathParams(params: Record<string, any>): any {
  return z.object(params);
}

/**
 * Helper to create query parameters object from Zod schema fields
 */
export function queryParams(params: Record<string, any>): any {
  return z.object(params);
}

/**
 * Register multiple schemas at once
 */
export function registerSchemas(registry: OpenAPIRegistry, schemas: Record<string, ZodSchema>): void {
  for (const [name, schema] of Object.entries(schemas)) {
    registry.register(name, schema);
  }
}
