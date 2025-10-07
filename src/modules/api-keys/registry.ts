import { createRegistry, registerPath, registerSchemas } from '../../core/openapi';
import { 
  ApiKeyMetadataSchema,
  CreateApiKeyRequestSchema, 
  CreateApiKeyResponseSchema, 
  DeleteApiKeyParamsSchema,
  DeleteApiKeyResponseSchema,
  ListApiKeysResponseSchema
} from './schema';

// Create OpenAPI registry for API keys module
export const apiKeysOpenApiRegistry = createRegistry();

// Register all schemas
registerSchemas(apiKeysOpenApiRegistry, {
  'CreateApiKeyRequest': CreateApiKeyRequestSchema,
  'DeleteApiKeyParams': DeleteApiKeyParamsSchema,
  'CreateApiKeyResponse': CreateApiKeyResponseSchema,
  'ApiKeyMetadata': ApiKeyMetadataSchema,
  'ListApiKeysResponse': ListApiKeysResponseSchema,
  'DeleteApiKeyResponse': DeleteApiKeyResponseSchema,
});

// Register OpenAPI paths using new compact API
registerPath(apiKeysOpenApiRegistry, {
  method: 'get',
  path: '/api-keys',
  tags: ['ApiKeys'],
  summary: 'List API Keys',
  description: 'List all API keys for the authenticated user. Plaintext keys are never returned.',
  response: {
    schema: ListApiKeysResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR']
});

registerPath(apiKeysOpenApiRegistry, {
  method: 'post',
  path: '/api-keys',
  tags: ['ApiKeys'],
  summary: 'Create API Key',
  description: 'Create a new API key for the authenticated user. The plaintext key is returned only once and must be stored securely.',
  response: {
    status: 201,
    schema: CreateApiKeyResponseSchema
  },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'INTERNAL_ERROR'],
  rateLimit: 'createApiKey',  // References the tagged rate limiter
  request: {
    body: CreateApiKeyRequestSchema
  }
});

registerPath(apiKeysOpenApiRegistry, {
  method: 'delete',
  path: '/api-keys/{id}',
  tags: ['ApiKeys'],
  summary: 'Delete API Key',
  description: 'Delete a specific API key. Users can only delete their own keys.',
  response: {
    schema: DeleteApiKeyResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'RESOURCE_NOT_FOUND', 'INTERNAL_ERROR'],
  request: {
    params: DeleteApiKeyParamsSchema
  }
});
