import { Router } from 'express';
import { validate } from '../../core/http/middleware/validation';
import { requireAdmin } from '../../core/http/middleware/rbac';
import { createRateLimiter } from '../../core/http/middleware/rateLimit';
import { 
  listLogs, 
  cleanupLogs, 
  getLogStats,
  ListLogsQuerySchema,
  CleanupLogsRequestSchema 
} from './handlers';

const router = Router();

// GET /logs - List logs with filtering (Admin only)
router.get('/',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    tag: 'logs:list'
  }),
  validate({ query: ListLogsQuerySchema }),
  ...requireAdmin(),
  listLogs
);

// GET /logs/stats - Get log statistics (Admin only)
router.get('/stats',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    tag: 'logs:stats'
  }),
  ...requireAdmin(),
  getLogStats
);

// POST /logs/cleanup - Clean up old logs (Admin only)
router.post('/cleanup',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes (destructive operation)
    message: 'Too many cleanup attempts, please try again later',
    tag: 'logs:cleanup'
  }),
  validate({ body: CleanupLogsRequestSchema }),
  ...requireAdmin(),
  cleanupLogs
);

export default router;
