import { Request, Response } from 'express';
import { sessionService } from '../../../core/services/sessionService';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type DeleteSessionParams, type DeleteSessionResponse } from '../schema';

/**
 * Delete Specific Session Handler
 * 
 * Deletes a specific session by ID. Validates that the session belongs to the current user.
 * Cannot delete the current session (use logout endpoint instead).
 * Requires valid session cookie.
 */
export async function deleteSessionHandler(
  req: Request<DeleteSessionParams, DeleteSessionResponse>,
  res: Response<DeleteSessionResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';
  
  try {
    const { id: sessionIdToDelete } = req.params;
    const user = req.user;
    const currentSessionToken = req.sessionToken;

    if (!user || !currentSessionToken) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Missing user or session token in delete session request',
        context: {
          hasUser: !!user,
          hasSessionToken: !!currentSessionToken,
        },
      });
    }

    // Prevent deleting current session
    if (sessionIdToDelete === currentSessionToken) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'CANNOT_DELETE_CURRENT_SESSION',
        logMessage: 'Attempt to delete current session via delete endpoint',
        context: {
          userId: user.id,
          sessionIdHash: sessionIdToDelete.substring(0, 8),
        },
      });
    }

    // Get all user sessions to verify ownership
    const userSessions = await sessionService.listUserSessions(user.id);
    const sessionToDelete = userSessions.find(session => session.tokenId === sessionIdToDelete);

    if (!sessionToDelete) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'SESSION_NOT_FOUND',
        logMessage: 'Attempt to delete non-existent or unauthorized session',
        context: {
          userId: user.id,
          sessionIdHash: sessionIdToDelete.substring(0, 8),
          userSessionCount: userSessions.length,
        },
      });
    }

    // Delete the session
    await sessionService.deleteSession(sessionIdToDelete);

    const response: DeleteSessionResponse = {
      ok: true,
      message: 'Session deleted successfully',
    };

    logger.info('Session deleted by user', {
      traceId,
      userId: user.id,
      deletedSessionId: sessionIdToDelete.substring(0, 8),
      deletedSessionCreatedAt: sessionToDelete.createdAt,
      deletedSessionLastUsed: sessionToDelete.lastUsedAt,
    });

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'DELETE_SESSION_FAILED',
      logMessage: 'Failed to delete session',
      context: {
        sessionIdHash: req.params.id?.substring(0, 8),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
