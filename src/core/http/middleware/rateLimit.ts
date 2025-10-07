import { Request } from 'express';
import { rateLimit, RateLimitRequestHandler, Options } from 'express-rate-limit';
import { getRealClientIp } from './cloudflare';

/**
 * Rate limit configuration options
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  tag?: string;  // Optional tag for referencing in OpenAPI docs
}

/**
 * Global registry for tagged rate limit configurations
 * Used to reference rate limits in OpenAPI documentation
 */
const rateLimitRegistry = new Map<string, RateLimitConfig>();

/**
 * Get a rate limit configuration by tag
 */
export function getRateLimitConfig(tag: string): RateLimitConfig | undefined {
  return rateLimitRegistry.get(tag);
}

/**
 * Get all registered rate limit tags
 */
export function getRateLimitTags(): string[] {
  return Array.from(rateLimitRegistry.keys());
}

/**
 * Predefined rate limit presets
 */
export const RATE_LIMIT_PRESETS = {
  // Very strict: 5 requests per 15 minutes
  strict: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests, please try again later',
  },
  // Moderate: 20 requests per 15 minutes
  moderate: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many requests, please try again later',
  },
  // Lenient: 100 requests per 15 minutes
  lenient: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
  },
  // API: 1000 requests per hour
  api: {
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: 'API rate limit exceeded, please try again later',
  },
} as const;

/**
 * Intelligent key generator that prioritizes user ID over IP address
 * This ensures authenticated users are rate-limited per account,
 * while unauthenticated users are rate-limited per IP
 */
function createKeyGenerator() {
  return (req: Request): string => {
    // Prefer user ID for authenticated requests
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    
    // Fallback to real client IP (respects Cloudflare headers)
    const ip = getRealClientIp(req);
    return `ip:${ip}`;
  };
}

/**
 * Creates a rate limiter middleware with the specified configuration
 * 
 * @param config - Rate limit configuration or preset name
 * @returns Express rate limit middleware
 * 
 * @example
 * // Using a preset
 * const limiter = createRateLimiter('strict');
 * 
 * @example
 * // Using custom configuration
 * const limiter = createRateLimiter({
 *   windowMs: 15 * 60 * 1000,
 *   max: 5,
 *   message: 'Custom error message'
 * });
 */
export function createRateLimiter(
  config: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS
): RateLimitRequestHandler {
  // Resolve preset or use custom config
  const rateLimitConfig: RateLimitConfig = 
    typeof config === 'string' ? RATE_LIMIT_PRESETS[config] : config;

  // Register in global registry if tag is provided
  if (rateLimitConfig.tag) {
    rateLimitRegistry.set(rateLimitConfig.tag, rateLimitConfig);
  }

  // Build rate limit options
  const options: Partial<Options> = {
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: createKeyGenerator(),
    skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
    skipFailedRequests: rateLimitConfig.skipFailedRequests,
    // Custom error response format matching our API error structure
    handler: (_req, res) => {
      const traceId = res.locals.traceId || 'unknown';
      res.status(429).json({
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: rateLimitConfig.message || 'Too many requests, please try again later',
        traceId,
      });
    },
  };

  return rateLimit(options);
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  strict: createRateLimiter('strict'),
  moderate: createRateLimiter('moderate'),
  lenient: createRateLimiter('lenient'),
  api: createRateLimiter('api'),
};
