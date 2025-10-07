import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { type UserIdParams, type UpdateUserRolesRequest, type UpdateUserRolesResponse } from '../schema';

/**
 * Update User Roles Handler
 * 
 * Updates the roles of a specific user.
 * Requires ADMIN role.
 * Cannot modify own roles.
 */
export async function updateUserRolesHandler(
  req: Request<UserIdParams, UpdateUserRolesResponse, UpdateUserRolesRequest>,
  res: Response<UpdateUserRolesResponse>
): Promise<void> {
  const traceId = res.locals.traceId || 'unknown';

  try {
    const { id } = req.params;
    const { roles } = req.body;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, roles: true },
    });

    if (!targetUser) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'RESOURCE_NOT_FOUND',
        logMessage: 'User not found for role update',
        context: {
          userId: id,
        },
      });
    }

    // Prevent self-role modification for safety
    if (targetUser.id === req.user!.id) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'CANNOT_MODIFY_SELF',
        logMessage: 'Attempt to modify own roles',
        context: {
          userId: req.user!.id,
        },
      });
    }

    // Update user roles
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roles },
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

    logger.info('User roles updated by admin', {
      adminUserId: req.user!.id,
      targetUserId: id,
      targetUserEmail: targetUser.email,
      oldRoles: targetUser.roles,
      newRoles: roles,
      traceId,
    });

    const response: UpdateUserRolesResponse = {
      message: 'User roles updated successfully',
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
      changes: {
        from: targetUser.roles,
        to: roles,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'UPDATE_USER_ROLES_FAILED',
      logMessage: 'Failed to update user roles',
      context: {
        userId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
