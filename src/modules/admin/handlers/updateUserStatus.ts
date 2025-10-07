import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type UserIdParams, type UpdateUserStatusResponse } from '../schema';

/**
 * Update User Status Handler
 * 
 * Toggles the active status of a specific user.
 * Requires ADMIN role.
 * Cannot deactivate own account.
 */
export async function updateUserStatusHandler(
  req: Request<UserIdParams, UpdateUserStatusResponse>,
  res: Response<UpdateUserStatusResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';

  try {
    const { id } = req.params;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true },
    });

    if (!targetUser) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'RESOURCE_NOT_FOUND',
        logMessage: 'User not found for status update',
        context: {
          userId: id,
        },
      });
    }

    // Prevent self-deactivation
    if (targetUser.id === req.user!.id) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'CANNOT_MODIFY_SELF',
        logMessage: 'Attempt to deactivate own account',
        context: {
          userId: req.user!.id,
        },
      });
    }

    // Toggle active status
    const newStatus = !targetUser.isActive;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus },
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
    });

    logger.info('User status changed by admin', {
      adminUserId: req.user!.id,
      targetUserId: id,
      targetUserEmail: targetUser.email,
      oldStatus: targetUser.isActive,
      newStatus,
      traceId,
    });

    const response: UpdateUserStatusResponse = {
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles,
        isActive: updatedUser.isActive,
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
      statusChange: {
        from: targetUser.isActive,
        to: newStatus,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'UPDATE_USER_STATUS_FAILED',
      logMessage: 'Failed to update user status',
      context: {
        userId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
