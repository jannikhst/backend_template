import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type CleanupLogsRequest, type CleanupLogsResponse } from '../schema';

export const cleanupLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { olderThanDays, level } = req.body as CleanupLogsRequest;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Build where clause
    const where: any = {
      timestamp: {
        lt: cutoffDate.toISOString(),
      },
    };

    if (level) {
      where.level = level;
    }

    // Count logs to be deleted
    const countToDelete = await prisma.logEntry.count({ where });

    if (countToDelete === 0) {
      const response: CleanupLogsResponse = {
        message: 'No logs found matching the cleanup criteria',
        deleted: 0,
        cutoffDate: cutoffDate.toISOString(),
        criteria: { olderThanDays, level },
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
      return;
    }

    // Delete logs
    const deleteResult = await prisma.logEntry.deleteMany({ where });

    logger.info('Log cleanup performed by admin', {
      adminUserId: req.user!.id,
      deletedCount: deleteResult.count,
      cutoffDate: cutoffDate.toISOString(),
      criteria: { olderThanDays, level },
      traceId: res.locals.traceId,
    });

    const response: CleanupLogsResponse = {
      message: `Successfully deleted ${deleteResult.count} log entries`,
      deleted: deleteResult.count,
      cutoffDate: cutoffDate.toISOString(),
      criteria: { olderThanDays, level },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'CLEANUP_LOGS_FAILED',
      logMessage: 'Failed to cleanup logs',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
