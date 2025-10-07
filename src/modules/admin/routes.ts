import { Router } from 'express';
import { validate } from '../../core/http/middleware/validation';
import { requireAdmin } from '../../core/http/middleware/rbac';
import { createRateLimiter } from '../../core/http/middleware/rateLimit';
import {
  listUsersHandler,
  updateUserRolesHandler,
  updateUserStatusHandler,
  getSystemStatsHandler,
} from './handlers';
import {
  UserIdParamsSchema,
  UpdateUserRolesRequestSchema,
} from './schema';

const router = Router();

// GET /admin/users - List all users (Admin only)
router.get('/users',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    tag: 'admin:list-users'
  }),
  ...requireAdmin(),
  listUsersHandler
);

// PUT /admin/users/:id/roles - Update user roles (Admin only)
router.put('/users/:id/roles',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: 'Too many role update attempts, please try again later',
    tag: 'admin:update-user-roles'
  }),
  validate({ params: UserIdParamsSchema, body: UpdateUserRolesRequestSchema }),
  ...requireAdmin(),
  updateUserRolesHandler
);

// PUT /admin/users/:id/status - Toggle user active status (Admin only)
router.put('/users/:id/status',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: 'Too many status update attempts, please try again later',
    tag: 'admin:update-user-status'
  }),
  validate({ params: UserIdParamsSchema }),
  ...requireAdmin(),
  updateUserStatusHandler
);

// GET /admin/system/stats - System statistics (Admin only)
router.get('/system/stats',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    tag: 'admin:system-stats'
  }),
  ...requireAdmin(),
  getSystemStatsHandler
);

export default router;
