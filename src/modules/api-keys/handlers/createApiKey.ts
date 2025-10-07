import { Request, Response } from 'express';
import { apiKeyService } from '../service';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { CreateApiKeyRequest } from '../schema';

export async function createApiKeyHandler(
  req: Request<{}, {}, CreateApiKeyRequest>,
  res: Response
) {
  const traceId = res.locals.traceId || 'unknown';
  const userId = req.user!.id; // User is guaranteed to exist due to auth middleware

  try {
    const { name, expiresAt } = req.body;

    // Create the API key
    const { apiKey, plaintext } = await apiKeyService.createApiKey(
      userId,
      name,
      expiresAt
    );

    logger.info('API key created via endpoint', {
      traceId,
      userId,
      apiKeyId: apiKey.id,
      hasName: !!name,
      hasExpiration: !!expiresAt,
    });

    // Return the API key data with plaintext (only time it's returned)
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      plaintext, // Only returned once!
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      keyFingerprint: apiKey.keyHash.slice(-6),
      traceId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Username') || error.message.includes('email')) {
        return sendErrorResponse({
          req,
          res,
          errorCode: 'INVALID_EMAIL_FORMAT',
          logMessage: 'Failed to create API key via endpoint',
          context: {
            userId,
            error: error.message,
          },
        });
      }

      if (error.message.includes('disabled')) {
        return sendErrorResponse({
          req,
          res,
          errorCode: 'ACCOUNT_DISABLED',
          logMessage: 'Failed to create API key via endpoint',
          context: {
            userId,
            error: error.message,
          },
        });
      }
    }

    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Failed to create API key via endpoint',
      context: {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
