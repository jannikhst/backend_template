import { z } from '../../core/extensions/zod';
import { UuidParamSchema } from '../../core/types/schemas';

// ============================================================================
// Request Schemas
// ============================================================================

// Schema for creating a new API key
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.iso.datetime().optional().transform((val) => val ? new Date(val) : undefined),
});

// Re-export for backward compatibility
export const DeleteApiKeyParamsSchema = UuidParamSchema.openapi('DeleteApiKeyParams');

// ============================================================================
// Response Schemas
// ============================================================================

// API Key metadata schema (for responses)
export const ApiKeyMetadataSchema = z.object({
  id: z.uuid().openapi({ description: 'Unique identifier for the API key' }),
  name: z.string().nullable().openapi({ description: 'User-defined name for the API key' }),
  createdAt: z.iso.datetime().openapi({ description: 'When the API key was created' }),
  lastUsedAt: z.iso.datetime().nullable().openapi({ description: 'When the API key was last used for authentication' }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: 'When the API key expires (null = never expires)' }),
  keyFingerprint: z.string().openapi({ description: 'Last 6 characters of the key hash for identification' })
}).openapi('ApiKeyMetadata');

// Response schema for creating an API key
export const CreateApiKeyResponseSchema = z.object({
  id: z.uuid().openapi({ description: 'Unique identifier for the API key' }),
  name: z.string().nullable().openapi({ description: 'User-defined name for the API key' }),
  plaintext: z.string().openapi({
    description: 'The API key in plaintext format. This is the ONLY time it will be returned!',
    example: 'john_a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'
  }),
  createdAt: z.iso.datetime().openapi({ description: 'When the API key was created' }),
  expiresAt: z.iso.datetime().nullable().openapi({ description: 'When the API key expires (null = never expires)' }),
  keyFingerprint: z.string().openapi({ description: 'Last 6 characters of the key hash for identification' }),
  traceId: z.string()
}).openapi('CreateApiKeyResponse');

// Response schema for deleting an API key
export const DeleteApiKeyResponseSchema = z.object({
  deletedId: z.uuid().openapi({ description: 'The ID of the deleted API key' }),
  traceId: z.string()
}).openapi('DeleteApiKeyResponse');

// Response schema for listing API keys
export const ListApiKeysResponseSchema = z.object({
  apiKeys: z.array(ApiKeyMetadataSchema),
  total: z.number().int().min(0),
  traceId: z.string()
}).openapi('ListApiKeysResponse');

// ============================================================================
// Type Exports
// ============================================================================

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type DeleteApiKeyParams = z.infer<typeof DeleteApiKeyParamsSchema>;
