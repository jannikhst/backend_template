import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type LogStatsResponse } from '../schema';

export const getLogStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check if database is available
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'SERVICE_UNAVAILABLE',
        logMessage: 'Database unavailable for log stats',
        context: {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        },
      });
    }

    // Get basic log statistics
    const [
      totalLogs,
      logsByLevel,
      logsByService,
      recentLogsCount,
      oldestLog,
      newestLog,
    ] = await Promise.all([
      // Total log count
      prisma.logEntry.count(),
      
      // Logs grouped by level
      prisma.logEntry.groupBy({
        by: ['level'],
        _count: {
          id: true,
        },
        orderBy: {
          level: 'asc',
        },
      }),
      
      // Logs grouped by service
      prisma.logEntry.groupBy({
        by: ['service'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      
      // Recent logs (last 24 hours)
      prisma.logEntry.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      }),
      
      // Oldest log
      prisma.logEntry.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
        select: {
          timestamp: true,
        },
      }),
      
      // Newest log
      prisma.logEntry.findFirst({
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          timestamp: true,
        },
      }),
    ]);

    // Calculate logs older than 7 days (for cleanup info)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const logsOlderThanWeek = await prisma.logEntry.count({
      where: {
        timestamp: {
          lt: sevenDaysAgo.toISOString(),
        },
      },
    });

    // Transform level stats to object
    const levelStats = logsByLevel.reduce((acc, item) => {
      acc[item.level] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Transform service stats to object
    const serviceStats = logsByService.reduce((acc, item) => {
      acc[item.service] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Log statistics accessed by admin', {
      adminUserId: req.user!.id,
      totalLogs,
      traceId: res.locals.traceId,
    });

    const response: LogStatsResponse = {
      summary: {
        totalLogs,
        recentLogs: recentLogsCount,
        logsOlderThanWeek,
        oldestLogDate: oldestLog?.timestamp.toISOString() || null,
        newestLogDate: newestLog?.timestamp.toISOString() || null,
      },
      breakdown: {
        byLevel: levelStats,
        byService: serviceStats,
      },
      cleanup: {
        eligibleForCleanup: logsOlderThanWeek,
        cutoffDate: sevenDaysAgo.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'GET_LOG_STATS_FAILED',
      logMessage: 'Failed to get log statistics',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
