import { z } from '../extensions/zod';
import { UserRole } from '@prisma/client';

// ============================================================================
// COMMON PARAMETER SCHEMAS
// ============================================================================

/**
 * UUID parameter schema for path parameters
 * Used across multiple modules for resource identification
 */
export const UuidParamSchema = z.object({
  id: z.uuid('Invalid UUID format').openapi({
    description: 'Resource UUID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
}).openapi('UuidParam');

// ============================================================================
// USER SCHEMAS
// ============================================================================

/**
 * Complete user profile schema
 * Used in auth and admin modules
 */
export const UserProfileSchema = z.object({
  id: z.string().openapi({
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  }),
  email: z.email().openapi({
    description: 'User email address',
    example: 'user@example.com'
  }),
  name: z.string().nullable().openapi({
    description: 'User display name',
    example: 'John Doe'
  }),
  roles: z.array(z.enum(UserRole)).openapi({
    description: 'User roles',
    example: ['USER']
  }),
  isActive: z.boolean().openapi({
    description: 'Whether the user account is active',
    example: true
  }),
  lastLoginAt: z.string().nullable().openapi({
    description: 'Last login timestamp (ISO 8601)',
    example: '2025-01-08T10:30:00.000Z'
  }),
  createdAt: z.string().openapi({
    description: 'Account creation timestamp (ISO 8601)',
    example: '2025-01-08T10:30:00.000Z'
  }),
  updatedAt: z.string().openapi({
    description: 'Last update timestamp (ISO 8601)',
    example: '2025-01-08T10:30:00.000Z'
  })
}).openapi('UserProfile');

/**
 * Minimal user profile (for auth responses)
 * Subset of UserProfileSchema without admin-specific fields
 */
export const MinimalUserProfileSchema = UserProfileSchema.pick({
  id: true,
  email: true,
  name: true,
  roles: true
}).openapi('MinimalUserProfile');

// ============================================================================
// COMMON RESPONSE SCHEMAS
// ============================================================================

/**
 * Standard success response schema
 * Used for simple success confirmations across modules
 */
export const SuccessResponseSchema = z.object({
  ok: z.literal(true).openapi({
    description: 'Success indicator',
    example: true
  }),
  message: z.string().openapi({
    description: 'Success message',
    example: 'Operation completed successfully'
  })
}).openapi('SuccessResponse');

/**
 * Success response with additional data
 */
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  schemaName: string
) {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    data: dataSchema
  }).openapi(schemaName);
}

// ============================================================================
// TIMESTAMP SCHEMAS
// ============================================================================

/**
 * ISO 8601 timestamp schema
 */
export const TimestampSchema = z.string().openapi({
  description: 'ISO 8601 timestamp',
  example: '2025-01-08T10:30:00.000Z'
});

/**
 * Nullable ISO 8601 timestamp schema
 */
export const NullableTimestampSchema = z.string().nullable().openapi({
  description: 'ISO 8601 timestamp (nullable)',
  example: '2025-01-08T10:30:00.000Z'
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UuidParam = z.infer<typeof UuidParamSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type MinimalUserProfile = z.infer<typeof MinimalUserProfileSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
