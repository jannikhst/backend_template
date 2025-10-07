import { z } from '../../core/extensions/zod';
import { UserRole } from '@prisma/client';
import { UuidParamSchema, UserProfileSchema } from '../../core/types/schemas';

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

// Re-export for backward compatibility
export const UserIdParamsSchema = UuidParamSchema.openapi('UserIdParams');

export const UpdateUserRolesRequestSchema = z.object({
  roles: z.array(z.enum(UserRole)).min(1, 'At least one role is required').openapi({
    description: 'Array of user roles',
    example: ['ADMIN', 'USER']
  })
}).openapi('UpdateUserRolesRequest');

// Re-export for backward compatibility
export const UserDetailsSchema = UserProfileSchema.openapi('UserDetails');

export const ListUsersResponseSchema = z.object({
  users: z.array(UserDetailsSchema).openapi({
    description: 'List of users'
  }),
  total: z.number().openapi({
    description: 'Total number of users',
    example: 42
  }),
  timestamp: z.string().openapi({
    description: 'Response timestamp (ISO 8601)',
    example: '2025-01-08T10:30:00.000Z'
  })
}).openapi('ListUsersResponse');

export const RoleChangeSchema = z.object({
  from: z.array(z.enum(UserRole)).openapi({
    description: 'Previous roles',
    example: ['USER']
  }),
  to: z.array(z.enum(UserRole)).openapi({
    description: 'New roles',
    example: ['ADMIN', 'USER']
  })
}).openapi('RoleChange');

export const UpdateUserRolesResponseSchema = z.object({
  message: z.string().openapi({
    description: 'Success message',
    example: 'User roles updated successfully'
  }),
  user: UserDetailsSchema,
  changes: RoleChangeSchema
}).openapi('UpdateUserRolesResponse');

export const StatusChangeSchema = z.object({
  from: z.boolean().openapi({
    description: 'Previous status',
    example: true
  }),
  to: z.boolean().openapi({
    description: 'New status',
    example: false
  })
}).openapi('StatusChange');

export const UpdateUserStatusResponseSchema = z.object({
  message: z.string().openapi({
    description: 'Success message',
    example: 'User deactivated successfully'
  }),
  user: UserDetailsSchema,
  statusChange: StatusChangeSchema
}).openapi('UpdateUserStatusResponse');

// ============================================================================
// SYSTEM STATISTICS SCHEMAS
// ============================================================================

export const UserStatsSchema = z.object({
  total: z.number().openapi({
    description: 'Total number of users',
    example: 100
  }),
  active: z.number().openapi({
    description: 'Number of active users',
    example: 95
  }),
  inactive: z.number().openapi({
    description: 'Number of inactive users',
    example: 5
  }),
  apiKeys: z.number().openapi({
    description: 'Total number of API keys',
    example: 150
  })
}).openapi('UserStats');

export const RoleStatsItemSchema = z.object({
  roles: z.array(z.enum(UserRole)).openapi({
    description: 'Role combination',
    example: ['USER']
  }),
  _count: z.number().openapi({
    description: 'Number of users with this role combination',
    example: 50
  })
}).openapi('RoleStatsItem');

export const SystemStatsResponseSchema = z.object({
  users: UserStatsSchema,
  roles: z.array(RoleStatsItemSchema).openapi({
    description: 'Role distribution statistics'
  }),
  timestamp: z.string().openapi({
    description: 'Response timestamp (ISO 8601)',
    example: '2025-01-08T10:30:00.000Z'
  })
}).openapi('SystemStatsResponse');

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
export type UpdateUserRolesRequest = z.infer<typeof UpdateUserRolesRequestSchema>;
export type UserDetails = z.infer<typeof UserDetailsSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
export type RoleChange = z.infer<typeof RoleChangeSchema>;
export type UpdateUserRolesResponse = z.infer<typeof UpdateUserRolesResponseSchema>;
export type StatusChange = z.infer<typeof StatusChangeSchema>;
export type UpdateUserStatusResponse = z.infer<typeof UpdateUserStatusResponseSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type RoleStatsItem = z.infer<typeof RoleStatsItemSchema>;
export type SystemStatsResponse = z.infer<typeof SystemStatsResponseSchema>;
