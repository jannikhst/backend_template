import { Router } from 'express';
import { validate } from '../../core/http/middleware/validation';
import { requireSession } from '../../core/http/middleware/auth';
import { createRateLimiter } from '../../core/http/middleware/rateLimit';
import { isAuthMethodEnabled, getAuthMethodsInfo } from '../../core/config/auth';
import {
  registerHandler,
  loginHandler,
  changePasswordHandler,
  listProvidersHandler,
  getSessionHandler,
  logoutHandler,
  logoutAllHandler,
  listSessionsHandler,
  deleteSessionHandler,
} from './handlers';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  ChangePasswordRequestSchema,
  DeleteSessionParamsSchema,
} from './schema';

const router = Router();

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// GET /auth/methods - Get available authentication methods
router.get('/methods',
  createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour
    tag: 'auth:methods'
  }),
  (_req, res) => {
    res.json(getAuthMethodsInfo());
  }
);

// ============================================================================
// EMAIL/PASSWORD AUTHENTICATION (conditional)
// ============================================================================

if (isAuthMethodEnabled('emailPassword')) {
  // POST /auth/register - Register new user with email/password
  router.post('/register',
    createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 registrations per hour
      tag: 'auth:register'
    }),
    validate({ body: RegisterRequestSchema }),
    registerHandler
  );

  // POST /auth/login - Login with email/password
  router.post('/login',
    createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 login attempts per 15 minutes
      tag: 'auth:login'
    }),
    validate({ body: LoginRequestSchema }),
    loginHandler
  );

  // POST /auth/change-password - Change password
  router.post('/change-password',
    createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 password changes per 15 minutes
      tag: 'auth:change-password'
    }),
    requireSession,
    validate({ body: ChangePasswordRequestSchema }),
    changePasswordHandler
  );
}

// ============================================================================
// OAUTH PROVIDERS (conditional)
// ============================================================================

// Google OAuth routes will be added here when implemented
// if (isAuthMethodEnabled('google')) { ... }

// Slack OAuth routes will be added here when implemented
// if (isAuthMethodEnabled('slack')) { ... }

// GitHub OAuth routes will be added here when implemented
// if (isAuthMethodEnabled('github')) { ... }

// ============================================================================
// SESSION MANAGEMENT (always available)
// ============================================================================

// GET /auth/providers - List authentication providers for current user
router.get('/providers',
  createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
    tag: 'auth:list-providers'
  }),
  requireSession,
  listProvidersHandler
);

// GET /auth/session - Get current session info
router.get('/session',
  createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour
    tag: 'auth:get-session'
  }),
  requireSession,
  getSessionHandler
);

// POST /auth/logout - Logout current session
router.post('/logout',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    tag: 'auth:logout'
  }),
  requireSession,
  logoutHandler
);

// POST /auth/logout-all - Logout all sessions
router.post('/logout-all',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: 'Too many logout-all requests, please try again later',
    tag: 'auth:logout-all'
  }),
  requireSession,
  logoutAllHandler
);

// GET /auth/sessions - List all active sessions
router.get('/sessions',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    tag: 'auth:list-sessions'
  }),
  requireSession,
  listSessionsHandler
);

// DELETE /auth/sessions/:id - Delete specific session
router.delete('/sessions/:id',
  createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    tag: 'auth:delete-session'
  }),
  validate({ params: DeleteSessionParamsSchema }),
  requireSession,
  deleteSessionHandler
);

export default router;
