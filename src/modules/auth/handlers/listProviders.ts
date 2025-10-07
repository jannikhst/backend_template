import { Request, Response } from 'express';
import { authProviderService } from '../../../core/services/authProviderService';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';

export async function listProvidersHandler(req: Request, res: Response) {
  const traceId = res.locals.traceId || 'unknown';
  const userId = req.user!.id;

  try {
    const providers = await authProviderService.listUserProviders(userId);

    logger.debug('Listed auth providers', {
      traceId,
      userId,
      providerCount: providers.length,
    });

    res.status(200).json({
      providers: providers.map(provider => ({
        id: provider.id,
        type: provider.type,
        providerId: provider.providerId,
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Failed to list auth providers',
      context: {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
