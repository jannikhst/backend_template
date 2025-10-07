import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type SystemStatsResponse } from '../schema';

/**
 * Get System Stats Handler
 * 
 * Returns system statistics including user counts, content counts, and role distribution.
 * Requires ADMIN or DEV role.
 */
export async function getSystemStatsHandler(
  req: Request<{}, SystemStatsResponse>,
  res: Response<SystemStatsResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';

  try {
    // Get basic system statistics
    const [
      totalUsers,
      activeUsers,
      totalApiKeys
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.apiKey.count(),
    ]);

    // Get role distribution
    const roleStats = await prisma.user.groupBy({
      by: ['roles'],
      _count: true,
    });

    logger.info('System stats accessed', {
      userId: req.user!.id,
      userRoles: req.user!.roles,
      traceId,
    });

    const response: SystemStatsResponse = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        apiKeys: totalApiKeys,
      },
      roles: roleStats.map(stat => ({
        roles: stat.roles,
        _count: stat._count,
      })),
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'GET_SYSTEM_STATS_FAILED',
      logMessage: 'Failed to get system statistics',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
