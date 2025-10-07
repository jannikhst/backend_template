import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sessionService } from '../../services/sessionService';
import { apiKeyService } from '../../../modules/api-keys/service';
import { config } from '../../config/env';
import { logger } from '../../logging';
import { prisma } from '../../db/client';
import { sendErrorResponse } from './errorHandler';

// Import Express types extension
import '../../types/express';

// Middleware to require valid session
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    // Extract session token from cookie
    const sessionToken = req.cookies[config.SESSION_COOKIE_NAME];
    
    if (!sessionToken) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'AUTHENTICATION_REQUIRED',
        logMessage: 'No session token provided',
      });
    }

    // Validate session in Redis
    const session = await sessionService.getSession(sessionToken);
    
    if (!session) {
      // Clear invalid cookie
      res.clearCookie(config.SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: config.COOKIE_SECURE,
        sameSite: config.COOKIE_SAMESITE,
      });
      
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INVALID_TOKEN',
        logMessage: 'Invalid or expired session',
        context: { tokenIdHash: sessionToken.substring(0, 8) },
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
      },
    });

    if (!user) {
      // Delete invalid session
      await sessionService.deleteSession(sessionToken);
      
      return sendErrorResponse({
        req,
        res,
        errorCode: 'AUTHENTICATION_REQUIRED',
        logMessage: 'User not found for valid session',
        context: {
          userId: session.uid,
          tokenIdHash: sessionToken.substring(0, 8),
        },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'USER_INACTIVE',
        logMessage: 'Inactive user attempted access',
        context: {
          userId: user.id,
          email: user.email,
        },
      });
    }

    // Attach user, session, and session token to request
    req.user = user;
    req.session = session;
    req.sessionToken = sessionToken;

    logger.debug('Session validated successfully', { 
      traceId, 
      userId: user.id,
      roles: user.roles 
    });

    next();
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Session validation error',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Middleware factory to require specific roles
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceId = res.locals.traceId || 'unknown';
    
    if (!req.user) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'requireRole called without requireSession',
      });
    }

    // Check if user has any of the required roles
    const hasRequiredRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRequiredRole) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        logMessage: 'Insufficient permissions',
        context: {
          userId: req.user.id,
          userRoles: req.user.roles,
          requiredRoles: allowedRoles,
        },
      });
    }

    logger.debug('Role check passed', {
      traceId,
      userId: req.user.id,
      userRoles: req.user.roles,
      requiredRoles: allowedRoles,
    });

    next();
  };
}

// Unified authentication middleware that supports both session cookies and API keys
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    // Check for API key in Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Validate API key
      const apiKeyRecord = await apiKeyService.validateApiKey(apiKey);
      
      if (apiKeyRecord) {
        // Update last used timestamp (non-blocking)
        apiKeyService.updateLastUsed(apiKeyRecord.id).catch(() => {
          // Ignore errors - this is not critical
        });
        
        // Attach user and API key info to request
        req.user = apiKeyRecord.user;
        req.apiKey = apiKeyRecord;
        
        logger.debug('API key authentication successful', {
          traceId,
          userId: apiKeyRecord.user.id,
          apiKeyId: apiKeyRecord.id,
          roles: apiKeyRecord.user.roles,
        });
        
        return next();
      } else {
        // Invalid API key - return generic error to prevent enumeration
        return sendErrorResponse({
          req,
          res,
          errorCode: 'INVALID_TOKEN',
          logMessage: 'Invalid API key provided',
        });
      }
    }
    
    // Fall back to session cookie authentication
    const sessionToken = req.cookies[config.SESSION_COOKIE_NAME];
    
    if (!sessionToken) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'AUTHENTICATION_REQUIRED',
        logMessage: 'No authentication provided',
      });
    }

    // Validate session in Redis
    const session = await sessionService.getSession(sessionToken);
    
    if (!session) {
      // Clear invalid cookie
      res.clearCookie(config.SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: config.COOKIE_SECURE,
        sameSite: config.COOKIE_SAMESITE,
      });
      
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INVALID_TOKEN',
        logMessage: 'Invalid or expired session',
        context: { tokenIdHash: sessionToken.substring(0, 8) },
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
      },
    });

    if (!user) {
      // Delete invalid session
      await sessionService.deleteSession(sessionToken);
      
      return sendErrorResponse({
        req,
        res,
        errorCode: 'AUTHENTICATION_REQUIRED',
        logMessage: 'User not found for valid session',
        context: {
          userId: session.uid,
          tokenIdHash: sessionToken.substring(0, 8),
        },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'USER_INACTIVE',
        logMessage: 'Inactive user attempted access',
        context: {
          userId: user.id,
          email: user.email,
        },
      });
    }

    // Attach user, session, and session token to request
    req.user = user;
    req.session = session;
    req.sessionToken = sessionToken;

    logger.debug('Session authentication successful', { 
      traceId, 
      userId: user.id,
      roles: user.roles 
    });

    next();
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Authentication error',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Middleware to add trace ID to all requests
export function addTraceId(req: Request, res: Response, next: NextFunction) {
  const traceId = req.headers['x-trace-id'] as string || 
                  `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.locals.traceId = traceId;
  res.setHeader('X-Trace-ID', traceId);
  
  next();
}
