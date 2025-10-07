import { z, booleanString } from '../extensions/zod';

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  SESSION_COOKIE_NAME: z.string().default('template_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86400), // 24 hours
  SESSION_SLIDING_EXTENSION_SECONDS: z.coerce.number().int().positive().default(3600), // 1 hour

  // Cookie Settings
  COOKIE_SECURE: booleanString().default(false),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Domain
  DOMAIN: z.string().default('localhost'),

  BEHIND_CLOUDFLARE: booleanString().default(false),

  DEFAULT_ROLE: z.string().default('GUEST'),

  // Authentication Providers
  AUTH_EMAIL_PASSWORD_ENABLED: booleanString().default(true),
  AUTH_GOOGLE_ENABLED: booleanString().default(false),
  AUTH_SLACK_ENABLED: booleanString().default(false),
  AUTH_GITHUB_ENABLED: booleanString().default(false),

  // Google OAuth (required if AUTH_GOOGLE_ENABLED=true)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Slack OAuth (required if AUTH_SLACK_ENABLED=true)
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().url().optional(),

  // GitHub OAuth (required if AUTH_GITHUB_ENABLED=true)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    console.error(error);
    process.exit(1);
  }
}

export const config = validateEnv();
