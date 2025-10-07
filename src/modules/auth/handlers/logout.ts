import { Request, Response } from 'express';
import { sessionService } from '../../../core/services/sessionService';
import { config } from '../../../core/config/env';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type LogoutResponse } from '../schema';

/**
 * Logout Handler
 * 
 * Deletes current session from Redis and clears session cookie.
 * Requires valid session cookie.
 */
export async function logoutHandler(
  req: Request<{}, LogoutResponse>,
  res: Response<LogoutResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    const sessionToken = req.sessionToken;
    const user = req.user;

    if (!sessionToken || !user) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Missing session token or user data in logout request',
        context: {
          hasSessionToken: !!sessionToken,
          hasUser: !!user,
        },
      });
    }

    // Delete session from Redis
    await sessionService.deleteSession(sessionToken);

    // Clear session cookie
    res.clearCookie(config.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAMESITE as 'lax' | 'strict' | 'none',
      path: '/',
    });

    const response: LogoutResponse = {
      ok: true,
      message: 'Logged out successfully',
    };

    logger.info('User logged out', {
      traceId,
      userId: user.id,
      email: user.email,
    });

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'LOGOUT_FAILED',
      logMessage: 'Logout failed',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
