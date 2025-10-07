import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type ListUsersResponse } from '../schema';

/**
 * List Users Handler
 * 
 * Returns a list of all users in the system.
 * Requires ADMIN role.
 */
export async function listUsersHandler(
  req: Request<{}, ListUsersResponse>,
  res: Response<ListUsersResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Admin user list accessed', {
      adminUserId: req.user!.id,
      userCount: users.length,
      traceId,
    });

    const response: ListUsersResponse = {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      total: users.length,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'LIST_USERS_FAILED',
      logMessage: 'Failed to list users',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
