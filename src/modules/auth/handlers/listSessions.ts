import { Request, Response } from 'express';
import { sessionService } from '../../../core/services/sessionService';
import { config } from '../../../core/config/env';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type ListSessionsResponse } from '../schema';

/**
 * List Sessions Handler
 * 
 * Returns all active sessions for the current user with metadata.
 * Requires valid session cookie.
 */
export async function listSessionsHandler(
  req: Request<{}, ListSessionsResponse>,
  res: Response<ListSessionsResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    const user = req.user;
    const currentSessionToken = req.sessionToken;

    if (!user || !currentSessionToken) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Missing user or session token in list sessions request',
        context: {
          hasUser: !!user,
          hasSessionToken: !!currentSessionToken,
        },
      });
    }

    // Get all user sessions from Redis
    const sessions = await sessionService.listUserSessions(user.id);

    // Transform sessions for response - calculate expiresAt from lastUsedAt + TTL
    const sessionList = await Promise.all(sessions.map(async (session) => {
      // Get full session to access exp field
      const fullSession = await sessionService.getSession(session.tokenId);
      const expiresAt = fullSession 
        ? new Date(fullSession.exp * 1000).toISOString()
        : new Date(session.lastUsedAt.getTime() + (config.SESSION_TTL_SECONDS * 1000)).toISOString();

      return {
        id: session.tokenId,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        expiresAt,
        ip: session.ip,
        userAgent: session.userAgent ? truncateUserAgent(session.userAgent) : undefined,
        isCurrent: session.tokenId === currentSessionToken,
      };
    }));

    const response: ListSessionsResponse = {
      sessions: sessionList,
    };

    logger.debug('Sessions listed', {
      traceId,
      userId: user.id,
      sessionCount: sessionList.length,
    });

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'LIST_SESSIONS_FAILED',
      logMessage: 'Failed to list sessions',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Helper function to truncate user agent for display
function truncateUserAgent(userAgent: string, maxLength: number = 80): string {
  if (userAgent.length <= maxLength) {
    return userAgent;
  }
  return userAgent.substring(0, maxLength - 3) + '...';
}
