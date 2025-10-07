import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { config } from './core/config/env';
import { validateAuthConfiguration } from './core/config/auth';
import { logger } from './core/logging';
import { prisma } from './core/db/client';
import { sessionService } from './core/services/sessionService';
import { extractCloudflareInfo } from './core/http/middleware/cloudflare';
import { requireAuth } from './core/http/middleware/auth';
import { errorHandler, notFoundHandler } from './core/http/middleware/errorHandler';
import { VersionService } from './core/services/versionService';

// Import routes
import authRoutes from './modules/auth/routes';
import apiKeysRoutes from './modules/api-keys/routes';
import docsRoutes from './modules/docs/routes';

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE STACK
// ============================================================================

/**
 * Generate unique trace ID for each request
 * Used for request tracking and correlation across logs
 */
app.use((_req: Request, res: Response, next: NextFunction) => {
  const traceId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.locals.traceId = traceId;
  res.setHeader('X-Trace-ID', traceId);
  next();
});

/**
 * Security headers with helmet
 */
app.use(helmet({
  contentSecurityPolicy: false, // Allow ReDoc to load external resources
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS configuration
 * Allows requests from configured origin
 */
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

/**
 * HTTP Parameter Pollution prevention
 */
app.use(hpp());

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Cookie parser for session management
 */
app.use(cookieParser());

/**
 * Extract real client IP from Cloudflare headers
 * Only active when BEHIND_CLOUDFLARE=true
 */
app.use(extractCloudflareInfo);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Root endpoint
 */
app.get('/', (_req: Request, res: Response) => {
  const versionInfo = VersionService.getVersion();
  
  res.json({
    name: 'Backend API',
    version: versionInfo.version,
    environment: config.NODE_ENV,
    documentation: '/v1/docs'
  });
});

/**
 * API v1 Routes
 */

// Public routes (no authentication required)
app.use('/v1/docs', docsRoutes);
app.use('/v1/auth', authRoutes);

// Protected routes (authentication required)
app.use('/v1/api-keys', requireAuth, apiKeysRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler for unmatched routes
 */
app.use(notFoundHandler);

/**
 * Global error handler
 * Must be last in middleware stack
 */
app.use(errorHandler);

// ============================================================================
// SERVER LIFECYCLE
// ============================================================================

/**
 * Start the server
 */
async function startServer() {
  try {
    // Validate authentication configuration
    validateAuthConfiguration();
    
    // Test database connection
    await prisma.$connect();
    logger.info('✓ Database connected');
    
    // Connect to Redis for session management
    await sessionService.connect();
    logger.info('✓ Redis connected');
    
    // Start HTTP server
    const PORT = config.PORT || 3000;
    const server = app.listen(PORT, () => {
      const version = VersionService.getVersion();
      logger.info('🚀 Server started', {
        port: PORT,
        environment: config.NODE_ENV,
        version: version.version,
        commit: version.buildCommit?.substring(0, 7) || 'unknown'
      });
      
      logger.info(`📖 Documentation available at: http://localhost:${PORT}/v1/docs`);
    });
    
    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await prisma.$disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Start the server
startServer();
