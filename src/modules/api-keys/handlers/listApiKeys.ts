import { Request, Response } from 'express';
import { apiKeyService } from '../service';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';

export async function listApiKeysHandler(req: Request, res: Response) {
  const traceId = res.locals.traceId || 'unknown';
  const userId = req.user!.id; // User is guaranteed to exist due to auth middleware

  try {
    // Get user's API keys (no sensitive data)
    const apiKeys = await apiKeyService.listUserApiKeys(userId);

    logger.debug('API keys listed via endpoint', {
      traceId,
      userId,
      keyCount: apiKeys.length,
    });

    res.status(200).json({
      apiKeys,
      total: apiKeys.length,
      traceId,
    });
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Failed to list API keys via endpoint',
      context: {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
