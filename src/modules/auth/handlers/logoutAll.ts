import { Request, Response } from 'express';
import { sessionService } from '../../../core/services/sessionService';
import { config } from '../../../core/config/env';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type LogoutAllResponse } from '../schema';

/**
 * Logout All Sessions Handler
 * 
 * Deletes all sessions for the current user from Redis and clears session cookie.
 * Requires valid session cookie.
 */
export async function logoutAllHandler(
  req: Request<{}, LogoutAllResponse>,
  res: Response<LogoutAllResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    const user = req.user;

    if (!user) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Missing user data in logout-all request',
        context: {
          hasUser: !!user,
        },
      });
    }

    // Get current session count before deletion
    const currentSessions = await sessionService.listUserSessions(user.id);
    const sessionCount = currentSessions.length;

    // Delete all user sessions from Redis
    await sessionService.deleteAllUserSessions(user.id);

    // Clear session cookie
    res.clearCookie(config.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAMESITE as 'lax' | 'strict' | 'none',
      path: '/',
    });

    const response: LogoutAllResponse = {
      ok: true,
      message: 'All sessions logged out successfully',
      sessionsDeleted: sessionCount,
    };

    logger.info('All user sessions logged out', {
      traceId,
      userId: user.id,
      email: user.email,
      sessionsDeleted: sessionCount,
    });

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'LOGOUT_ALL_FAILED',
      logMessage: 'Logout-all failed',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
