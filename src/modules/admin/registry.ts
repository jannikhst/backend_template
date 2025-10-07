import { createRegistry, registerSchemas, registerPath } from '../../core/openapi';
import {
  UserIdParamsSchema,
  UpdateUserRolesRequestSchema,
  UserDetailsSchema,
  ListUsersResponseSchema,
  RoleChangeSchema,
  UpdateUserRolesResponseSchema,
  StatusChangeSchema,
  UpdateUserStatusResponseSchema,
  UserStatsSchema,
  RoleStatsItemSchema,
  SystemStatsResponseSchema,
} from './schema';

// Create OpenAPI registry for admin module
export const adminOpenApiRegistry = createRegistry();

// Register all schemas
registerSchemas(adminOpenApiRegistry, {
  'UserIdParams': UserIdParamsSchema,
  'UpdateUserRolesRequest': UpdateUserRolesRequestSchema,
  'UserDetails': UserDetailsSchema,
  'ListUsersResponse': ListUsersResponseSchema,
  'RoleChange': RoleChangeSchema,
  'UpdateUserRolesResponse': UpdateUserRolesResponseSchema,
  'StatusChange': StatusChangeSchema,
  'UpdateUserStatusResponse': UpdateUserStatusResponseSchema,
  'UserStats': UserStatsSchema,
  'RoleStatsItem': RoleStatsItemSchema,
  'SystemStatsResponse': SystemStatsResponseSchema,
});

// Register OpenAPI paths
registerPath(adminOpenApiRegistry, {
  method: 'get',
  path: '/admin/users',
  tags: ['Admin'],
  summary: 'List all users',
  description: 'Returns a list of all users in the system. Requires ADMIN role.',
  response: {
    schema: ListUsersResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'LIST_USERS_FAILED'],
  rateLimit: 'admin:list-users'
});

registerPath(adminOpenApiRegistry, {
  method: 'put',
  path: '/admin/users/{id}/roles',
  tags: ['Admin'],
  summary: 'Update user roles',
  description: 'Updates the roles of a specific user. Cannot modify own roles. Requires ADMIN role.',
  response: {
    schema: UpdateUserRolesResponseSchema
  },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'CANNOT_MODIFY_SELF', 'RESOURCE_NOT_FOUND', 'UPDATE_USER_ROLES_FAILED'],
  rateLimit: 'admin:update-user-roles',
  request: {
    params: UserIdParamsSchema,
    body: UpdateUserRolesRequestSchema
  }
});

registerPath(adminOpenApiRegistry, {
  method: 'put',
  path: '/admin/users/{id}/status',
  tags: ['Admin'],
  summary: 'Toggle user active status',
  description: 'Toggles the active status of a specific user. Cannot deactivate own account. Requires ADMIN role.',
  response: {
    schema: UpdateUserStatusResponseSchema
  },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'CANNOT_MODIFY_SELF', 'RESOURCE_NOT_FOUND', 'UPDATE_USER_STATUS_FAILED'],
  rateLimit: 'admin:update-user-status',
  request: {
    params: UserIdParamsSchema
  }
});

registerPath(adminOpenApiRegistry, {
  method: 'get',
  path: '/admin/system/stats',
  tags: ['Admin'],
  summary: 'Get system statistics',
  description: 'Returns system statistics including user counts, content counts, and role distribution. Requires ADMIN role.',
  response: {
    schema: SystemStatsResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'GET_SYSTEM_STATS_FAILED'],
  rateLimit: 'admin:system-stats'
});
