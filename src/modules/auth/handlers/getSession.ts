import { Request, Response } from 'express';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type GetSessionResponse } from '../schema';

/**
 * Get Current Session Handler
 * 
 * Returns current session information for authenticated user.
 * Requires valid session cookie.
 */
export async function getSessionHandler(
  req: Request<{}, GetSessionResponse>,
  res: Response<GetSessionResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    // User and session data are attached by requireSession middleware
    const user = req.user;
    const session = req.session;

    if (!user || !session) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Missing user or session data in authenticated request',
        context: {
          hasUser: !!user,
          hasSession: !!session,
        },
      });
    }

    // Prepare response
    const response: GetSessionResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        roles: user.roles,
      },
      session: {
        createdAt: new Date(session.createdAt * 1000).toISOString(),
        lastUsedAt: new Date(session.lastUsedAt * 1000).toISOString(),
        expiresAt: new Date(session.exp * 1000).toISOString(),
        ip: session.ip,
        userAgent: session.userAgent,
      },
    };

    logger.debug('Session info retrieved', {
      traceId,
      userId: user.id,
      sessionAge: Math.floor(Date.now() / 1000) - session.createdAt,
    });

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'GET_SESSION_FAILED',
      logMessage: 'Failed to get session info',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
