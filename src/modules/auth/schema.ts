import { z } from '../../core/extensions/zod';
import { MinimalUserProfileSchema, SuccessResponseSchema } from '../../core/types/schemas';

// Re-export for backward compatibility
export const UserProfileSchema = MinimalUserProfileSchema;

// ============================================================================
// REGISTRATION SCHEMAS
// ============================================================================

export const RegisterRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "User email address",
    example: "user@example.com"
  }),
  password: z.string().min(8).max(128).openapi({
    description: "User password (min 8 characters, must contain letter and number)",
    example: "SecurePass123"
  }),
  name: z.string().optional().openapi({
    description: "User's display name",
    example: "John Doe"
  })
}).openapi('RegisterRequest');

export const RegisterResponseSchema = z.object({
  user: UserProfileSchema,
  session: z.object({
    createdAt: z.string().openapi({
      description: "Session creation timestamp (ISO 8601)",
      example: "2025-01-08T10:30:00.000Z"
    }),
    expiresAt: z.string().openapi({
      description: "Session expiration timestamp (ISO 8601)",
      example: "2025-01-08T18:30:00.000Z"
    })
  })
}).openapi('RegisterResponse');

// ============================================================================
// LOGIN SCHEMAS
// ============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "User email address",
    example: "user@example.com"
  }),
  password: z.string().openapi({
    description: "User password",
    example: "SecurePass123"
  })
}).openapi('LoginRequest');

export const LoginResponseSchema = z.object({
  user: UserProfileSchema,
  session: z.object({
    createdAt: z.string().openapi({
      description: "Session creation timestamp (ISO 8601)",
      example: "2025-01-08T10:30:00.000Z"
    }),
    expiresAt: z.string().openapi({
      description: "Session expiration timestamp (ISO 8601)",
      example: "2025-01-08T18:30:00.000Z"
    })
  })
}).openapi('LoginResponse');

// ============================================================================
// PASSWORD CHANGE SCHEMAS
// ============================================================================

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().openapi({
    description: "Current password",
    example: "OldPass123"
  }),
  newPassword: z.string().min(8).max(128).openapi({
    description: "New password (min 8 characters, must contain letter and number)",
    example: "NewSecurePass456"
  })
}).openapi('ChangePasswordRequest');

export const ChangePasswordResponseSchema = SuccessResponseSchema.openapi('ChangePasswordResponse');

// ============================================================================
// AUTH METHODS SCHEMAS
// ============================================================================

export const AuthMethodsResponseSchema = z.object({
  methods: z.array(z.enum(['emailPassword', 'google', 'slack', 'github'])).openapi({
    description: 'List of enabled authentication methods',
    example: ['emailPassword', 'google']
  }),
  emailPassword: z.boolean().openapi({
    description: 'Whether email/password authentication is enabled',
    example: true
  }),
  google: z.boolean().openapi({
    description: 'Whether Google OAuth is enabled',
    example: true
  }),
  slack: z.boolean().openapi({
    description: 'Whether Slack OAuth is enabled',
    example: false
  }),
  github: z.boolean().openapi({
    description: 'Whether GitHub OAuth is enabled',
    example: false
  })
}).openapi('AuthMethodsResponse');

// ============================================================================
// OAUTH SCHEMAS
// ============================================================================

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().openapi({
    description: "Authorization code from OAuth provider",
    example: "4/0AY0e-g7..."
  }),
  state: z.string().openapi({
    description: "State parameter for CSRF protection",
    example: "random_state_string"
  }),
  error: z.string().optional().openapi({
    description: "Error code if OAuth failed",
    example: "access_denied"
  }),
  error_description: z.string().optional().openapi({
    description: "Human-readable error description",
    example: "The user denied access"
  })
}).openapi('OAuthCallbackQuery');

export const OAuthInitiateResponseSchema = z.object({
  redirectUrl: z.string().url().openapi({
    description: "URL to redirect to for OAuth authorization",
    example: "https://accounts.google.com/o/oauth2/v2/auth?..."
  })
}).openapi('OAuthInitiateResponse');

// ============================================================================
// AUTH PROVIDER SCHEMAS
// ============================================================================

export const AuthProviderSchema = z.object({
  id: z.string().openapi({
    description: "Provider ID",
    example: "prov_abc123"
  }),
  type: z.enum(['EMAIL_PASSWORD', 'GOOGLE', 'GITHUB', 'SLACK']).openapi({
    description: "Authentication provider type",
    example: "EMAIL_PASSWORD"
  }),
  providerId: z.string().nullable().openapi({
    description: "External provider ID (for OAuth providers)",
    example: null
  }),
  createdAt: z.string().openapi({
    description: "Provider creation timestamp (ISO 8601)",
    example: "2025-01-08T10:30:00.000Z"
  }),
  updatedAt: z.string().openapi({
    description: "Provider last update timestamp (ISO 8601)",
    example: "2025-01-08T10:30:00.000Z"
  })
}).openapi('AuthProvider');

export const ListProvidersResponseSchema = z.object({
  providers: z.array(AuthProviderSchema).openapi({
    description: "List of authentication providers for the user"
  })
}).openapi('ListProvidersResponse');

// ============================================================================
// SESSION SCHEMAS
// ============================================================================

export const SessionMetadataSchema = z.object({
  createdAt: z.string().openapi({
    description: "Session creation timestamp (ISO 8601)",
    example: "2025-01-08T10:30:00.000Z"
  }),
  lastUsedAt: z.string().openapi({
    description: "Last session usage timestamp (ISO 8601)",
    example: "2025-01-08T11:45:00.000Z"
  }),
  expiresAt: z.string().openapi({
    description: "Session expiration timestamp (ISO 8601)",
    example: "2025-01-08T18:30:00.000Z"
  }),
  ip: z.string().optional().openapi({
    description: "Client IP address",
    example: "192.168.1.100"
  }),
  userAgent: z.string().optional().openapi({
    description: "Client user agent",
    example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  })
}).openapi('SessionMetadata');

export const GetSessionResponseSchema = z.object({
  user: UserProfileSchema,
  session: SessionMetadataSchema
}).openapi('GetSessionResponse');

// ============================================================================
// LOGOUT SCHEMAS
// ============================================================================

export const LogoutResponseSchema = SuccessResponseSchema.openapi('LogoutResponse');

export const LogoutAllResponseSchema = z.object({
  ok: z.literal(true).openapi({
    description: "Success indicator",
    example: true
  }),
  message: z.string().openapi({
    description: "Success message",
    example: "All sessions logged out successfully"
  }),
  sessionsDeleted: z.number().openapi({
    description: "Number of sessions that were deleted",
    example: 3
  })
}).openapi('LogoutAllResponse');

// ============================================================================
// SESSION MANAGEMENT SCHEMAS
// ============================================================================

export const SessionListItemSchema = z.object({
  id: z.string().openapi({
    description: "Session ID",
    example: "sess_abc123def456"
  }),
  createdAt: z.string().openapi({
    description: "Session creation timestamp (ISO 8601)",
    example: "2025-01-08T10:30:00.000Z"
  }),
  lastUsedAt: z.string().openapi({
    description: "Last session usage timestamp (ISO 8601)",
    example: "2025-01-08T11:45:00.000Z"
  }),
  expiresAt: z.string().openapi({
    description: "Session expiration timestamp (ISO 8601)",
    example: "2025-01-08T18:30:00.000Z"
  }),
  ip: z.string().optional().openapi({
    description: "Client IP address",
    example: "192.168.1.100"
  }),
  userAgent: z.string().optional().openapi({
    description: "Client user agent",
    example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }),
  isCurrent: z.boolean().openapi({
    description: "Whether this is the current session",
    example: true
  })
}).openapi('SessionListItem');

export const ListSessionsResponseSchema = z.object({
  sessions: z.array(SessionListItemSchema).openapi({
    description: "List of active sessions",
  })
}).openapi('ListSessionsResponse');

export const DeleteSessionParamsSchema = z.object({
  id: z.string()
    .min(1, "Session ID is required")
    .openapi({
      description: "Session ID to delete",
      example: "sess_abc123def456"
    })
}).openapi('DeleteSessionParams');

export const DeleteSessionResponseSchema = SuccessResponseSchema.openapi('DeleteSessionResponse');

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;
export type AuthMethodsResponse = z.infer<typeof AuthMethodsResponseSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
export type OAuthInitiateResponse = z.infer<typeof OAuthInitiateResponseSchema>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type ListProvidersResponse = z.infer<typeof ListProvidersResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type LogoutAllResponse = z.infer<typeof LogoutAllResponseSchema>;
export type SessionListItem = z.infer<typeof SessionListItemSchema>;
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;
export type DeleteSessionParams = z.infer<typeof DeleteSessionParamsSchema>;
export type DeleteSessionResponse = z.infer<typeof DeleteSessionResponseSchema>;
