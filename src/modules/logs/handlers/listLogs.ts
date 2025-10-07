import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type ListLogsQuery, type ListLogsResponse } from '../schema';

export const listLogs = async (
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
        logMessage: 'Database unavailable for log access',
        context: {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        },
      });
    }

    const {
      page = 1,
      pageSize = 20,
      level,
      service,
      traceId,
      userId,
      startDate,
      endDate,
      search,
    } = req.query as unknown as ListLogsQuery;

    // Ensure page and pageSize are numbers
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 20;

    // Build where clause for filtering
    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (service) {
      where.service = service;
    }

    if (traceId) {
      where.traceId = traceId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        // Convert to ISO-8601 DateTime string for start of day
        const startDateTime = new Date(startDate);
        startDateTime.setUTCHours(0, 0, 0, 0);
        where.timestamp.gte = startDateTime.toISOString();
      }
      if (endDate) {
        // Convert to ISO-8601 DateTime string for end of day
        const endDateTime = new Date(endDate);
        endDateTime.setUTCHours(23, 59, 59, 999);
        where.timestamp.lte = endDateTime.toISOString();
      }
    }

    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Calculate pagination
    const skip = (pageNum - 1) * pageSizeNum;

    // Get logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.logEntry.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          timestamp: true,
          level: true,
          message: true,
          service: true,
          environment: true,
          context: true,
          traceId: true,
          userId: true,
        },
      }),
      prisma.logEntry.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSizeNum);

    logger.info('Logs accessed by admin', {
      adminUserId: req.user!.id,
      filters: { level, service, traceId, userId, startDate, endDate, search },
      resultCount: logs.length,
      totalCount,
      page: pageNum,
      pageSize: pageSizeNum,
      traceId: res.locals.traceId,
    });

    const response: ListLogsResponse = {
      logs: logs.map(log => ({
        ...log,
        level: log.level as 'info' | 'warn' | 'error' | 'debug',
        timestamp: log.timestamp.toISOString(),
        context: log.context as Record<string, any> | null,
      })),
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
      filters: {
        level,
        service,
        traceId,
        userId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        search,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'LIST_LOGS_FAILED',
      logMessage: 'Failed to list logs',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
