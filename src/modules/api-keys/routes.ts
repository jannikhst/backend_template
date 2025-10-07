import { Router } from 'express';
import { validate } from '../../core/http/middleware/validation';
import { requireAuth, requireSession } from '../../core/http/middleware/auth';
import { createRateLimiter } from '../../core/http/middleware/rateLimit';
import {
  createApiKeyHandler,
  listApiKeysHandler,
  deleteApiKeyHandler,
  CreateApiKeyRequestSchema,
  DeleteApiKeyParamsSchema,
} from './handlers';

const router = Router();

// Rate limiting for API key creation (strict: 5 requests per 15 minutes)
const createApiKeyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many API key creation attempts, please try again later',
  tag: 'createApiKey',  // Tag for OpenAPI documentation
});

// GET /api-keys - List current user's API keys
router.get('/',
  requireAuth,
  listApiKeysHandler
);

// POST /api-keys - Create new API key (Session-only, no API key auth)
router.post('/',
  createApiKeyLimiter,
  requireSession,
  validate({ body: CreateApiKeyRequestSchema }),
  createApiKeyHandler
);

// DELETE /api-keys/:id - Delete specific API key (Session-only, no API key auth)
router.delete('/:id',
  requireSession,
  validate({ params: DeleteApiKeyParamsSchema }),
  deleteApiKeyHandler
);

export default router;
