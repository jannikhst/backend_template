import { createRegistry, registerSchemas, registerPath } from '../../core/openapi';
import { isAuthMethodEnabled } from '../../core/config/auth';
import {
  AuthMethodsResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  ChangePasswordRequestSchema,
  ChangePasswordResponseSchema,
  OAuthCallbackQuerySchema,
  OAuthInitiateResponseSchema,
  AuthProviderSchema,
  ListProvidersResponseSchema,
  UserProfileSchema,
  SessionMetadataSchema,
  GetSessionResponseSchema,
  LogoutResponseSchema,
  LogoutAllResponseSchema,
  SessionListItemSchema,
  ListSessionsResponseSchema,
  DeleteSessionParamsSchema,
  DeleteSessionResponseSchema,
} from './schema';

// Create OpenAPI registry for auth module
export const authOpenApiRegistry = createRegistry();

// Register all schemas
registerSchemas(authOpenApiRegistry, {
  'AuthMethodsResponse': AuthMethodsResponseSchema,
  'RegisterRequest': RegisterRequestSchema,
  'RegisterResponse': RegisterResponseSchema,
  'LoginRequest': LoginRequestSchema,
  'LoginResponse': LoginResponseSchema,
  'ChangePasswordRequest': ChangePasswordRequestSchema,
  'ChangePasswordResponse': ChangePasswordResponseSchema,
  'OAuthCallbackQuery': OAuthCallbackQuerySchema,
  'OAuthInitiateResponse': OAuthInitiateResponseSchema,
  'AuthProvider': AuthProviderSchema,
  'ListProvidersResponse': ListProvidersResponseSchema,
  'UserProfile': UserProfileSchema,
  'SessionMetadata': SessionMetadataSchema,
  'GetSessionResponse': GetSessionResponseSchema,
  'LogoutResponse': LogoutResponseSchema,
  'LogoutAllResponse': LogoutAllResponseSchema,
  'SessionListItem': SessionListItemSchema,
  'ListSessionsResponse': ListSessionsResponseSchema,
  'DeleteSessionParams': DeleteSessionParamsSchema,
  'DeleteSessionResponse': DeleteSessionResponseSchema,
});

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

registerPath(authOpenApiRegistry, {
  method: 'get',
  path: '/auth/methods',
  tags: ['Authentication'],
  summary: 'Get available authentication methods',
  description: 'Returns information about which authentication methods are enabled on this server',
  security: 'public',
  response: {
    schema: AuthMethodsResponseSchema
  },
  errors: [],
  rateLimit: 'auth:methods'
});

registerPath(authOpenApiRegistry, {
  method: 'post',
  path: '/auth/register',
  tags: ['Authentication'],
  summary: 'Register new user',
  description: 'Register a new user with email and password. Creates a session automatically.',
  security: 'public',
  response: {
    schema: RegisterResponseSchema,
    status: 201
  },
  errors: ['VALIDATION_ERROR', 'DUPLICATE_ENTRY', 'INTERNAL_ERROR'],
  rateLimit: 'auth:register',
  request: {
    body: RegisterRequestSchema
  }
});

registerPath(authOpenApiRegistry, {
  method: 'post',
  path: '/auth/login',
  tags: ['Authentication'],
  summary: 'Login with email and password',
  description: 'Authenticate with email and password. Creates a session cookie on success.',
  security: 'public',
  response: {
    schema: LoginResponseSchema
  },
  errors: ['VALIDATION_ERROR', 'INVALID_CREDENTIALS', 'INTERNAL_ERROR'],
  rateLimit: 'auth:login',
  request: {
    body: LoginRequestSchema
  }
});

registerPath(authOpenApiRegistry, {
  method: 'post',
  path: '/auth/change-password',
  tags: ['Authentication'],
  summary: 'Change password',
  description: 'Change the password for the authenticated user',
  response: {
    schema: ChangePasswordResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'VALIDATION_ERROR', 'INVALID_CREDENTIALS', 'INTERNAL_ERROR'],
  rateLimit: 'auth:change-password',
  request: {
    body: ChangePasswordRequestSchema
  }
});

registerPath(authOpenApiRegistry, {
  method: 'get',
  path: '/auth/providers',
  tags: ['Authentication'],
  summary: 'List authentication providers',
  description: 'Returns all authentication providers configured for the current user',
  response: {
    schema: ListProvidersResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR'],
  rateLimit: 'auth:list-providers'
});

registerPath(authOpenApiRegistry, {
  method: 'get',
  path: '/auth/session',
  tags: ['Authentication'],
  summary: 'Get current session information',
  description: 'Returns current session and user information',
  response: {
    schema: GetSessionResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR', 'GET_SESSION_FAILED'],
  rateLimit: 'auth:get-session'
});

registerPath(authOpenApiRegistry, {
  method: 'post',
  path: '/auth/logout',
  tags: ['Authentication'],
  summary: 'Logout current session',
  description: 'Deletes current session and clears cookie',
  response: {
    schema: LogoutResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR', 'LOGOUT_FAILED'],
  rateLimit: 'auth:logout'
});

registerPath(authOpenApiRegistry, {
  method: 'post',
  path: '/auth/logout-all',
  tags: ['Authentication'],
  summary: 'Logout all sessions',
  description: 'Deletes all sessions for current user and clears cookie',
  response: {
    schema: LogoutAllResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR', 'LOGOUT_ALL_FAILED'],
  rateLimit: 'auth:logout-all'
});

registerPath(authOpenApiRegistry, {
  method: 'get',
  path: '/auth/sessions',
  tags: ['Authentication'],
  summary: 'List active sessions',
  description: 'Returns all active sessions for current user',
  response: {
    schema: ListSessionsResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'INTERNAL_ERROR', 'LIST_SESSIONS_FAILED'],
  rateLimit: 'auth:list-sessions'
});

registerPath(authOpenApiRegistry, {
  method: 'delete',
  path: '/auth/sessions/{id}',
  tags: ['Authentication'],
  summary: 'Delete specific session',
  description: 'Deletes a specific session by ID (cannot delete current session)',
  response: {
    schema: DeleteSessionResponseSchema
  },
  errors: ['AUTHENTICATION_REQUIRED', 'CANNOT_DELETE_CURRENT_SESSION', 'SESSION_NOT_FOUND', 'DELETE_SESSION_FAILED'],
  rateLimit: 'auth:delete-session',
  request: {
    params: DeleteSessionParamsSchema
  }
});

// ============================================================================
// OAUTH ENDPOINTS (dynamically registered based on configuration)
// ============================================================================

// Google OAuth
if (isAuthMethodEnabled('google')) {
  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/google',
    tags: ['OAuth'],
    summary: 'Initiate Google OAuth flow',
    description: 'Redirects to Google for authentication. Only available if Google OAuth is enabled in server configuration.',
    security: 'public',
    response: {
      schema: OAuthInitiateResponseSchema,
      status: 302,
      description: 'Redirect to Google OAuth authorization page'
    },
    errors: ['INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-initiate'
  });

  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/google/callback',
    tags: ['OAuth'],
    summary: 'Google OAuth callback',
    description: 'Handles the callback from Google OAuth. Creates or logs in user and establishes a session.',
    security: 'public',
    response: {
      schema: LoginResponseSchema,
      description: 'User authenticated successfully'
    },
    errors: ['INVALID_CREDENTIALS', 'VALIDATION_ERROR', 'INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-callback',
    request: {
      query: OAuthCallbackQuerySchema
    }
  });
}

// Slack OAuth
if (isAuthMethodEnabled('slack')) {
  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/slack',
    tags: ['OAuth'],
    summary: 'Initiate Slack OAuth flow',
    description: 'Redirects to Slack for authentication. Only available if Slack OAuth is enabled in server configuration.',
    security: 'public',
    response: {
      schema: OAuthInitiateResponseSchema,
      status: 302,
      description: 'Redirect to Slack OAuth authorization page'
    },
    errors: ['INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-initiate'
  });

  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/slack/callback',
    tags: ['OAuth'],
    summary: 'Slack OAuth callback',
    description: 'Handles the callback from Slack OAuth. Creates or logs in user and establishes a session.',
    security: 'public',
    response: {
      schema: LoginResponseSchema,
      description: 'User authenticated successfully'
    },
    errors: ['INVALID_CREDENTIALS', 'VALIDATION_ERROR', 'INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-callback',
    request: {
      query: OAuthCallbackQuerySchema
    }
  });
}

// GitHub OAuth
if (isAuthMethodEnabled('github')) {
  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/github',
    tags: ['OAuth'],
    summary: 'Initiate GitHub OAuth flow',
    description: 'Redirects to GitHub for authentication. Only available if GitHub OAuth is enabled in server configuration.',
    security: 'public',
    response: {
      schema: OAuthInitiateResponseSchema,
      status: 302,
      description: 'Redirect to GitHub OAuth authorization page'
    },
    errors: ['INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-initiate'
  });

  registerPath(authOpenApiRegistry, {
    method: 'get',
    path: '/auth/github/callback',
    tags: ['OAuth'],
    summary: 'GitHub OAuth callback',
    description: 'Handles the callback from GitHub OAuth. Creates or logs in user and establishes a session.',
    security: 'public',
    response: {
      schema: LoginResponseSchema,
      description: 'User authenticated successfully'
    },
    errors: ['INVALID_CREDENTIALS', 'VALIDATION_ERROR', 'INTERNAL_ERROR'],
    rateLimit: 'auth:oauth-callback',
    request: {
      query: OAuthCallbackQuerySchema
    }
  });
}
