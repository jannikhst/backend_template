import { Request, Response } from 'express';
import { apiKeyService } from '../service';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { DeleteApiKeyParams } from '../schema';

export async function deleteApiKeyHandler(
  req: Request<DeleteApiKeyParams>,
  res: Response
) {
  const traceId = res.locals.traceId || 'unknown';
  const userId = req.user!.id; // User is guaranteed to exist due to auth middleware
  const { id: apiKeyId } = req.params;

  try {
    // Delete the API key (user can only delete their own keys)
    await apiKeyService.deleteApiKey(apiKeyId, userId);

    logger.info('API key deleted via endpoint', {
      traceId,
      userId,
      apiKeyId,
    });

    res.status(200).json({
      deletedId: apiKeyId,
      traceId,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'API_KEY_NOT_FOUND',
        logMessage: 'Failed to delete API key via endpoint',
        context: {
          userId,
          apiKeyId,
          error: error.message,
        },
      });
    }

    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Failed to delete API key via endpoint',
      context: {
        userId,
        apiKeyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
