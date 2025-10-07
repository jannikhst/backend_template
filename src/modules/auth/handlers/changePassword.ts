import { Request, Response } from 'express';
import { authProviderService } from '../../../core/services/authProviderService';
import { passwordService } from '../../../core/services/passwordService';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import type { ChangePasswordRequest } from '../schema';

export async function changePasswordHandler(req: Request, res: Response) {
  const traceId = res.locals.traceId || 'unknown';
  const { currentPassword, newPassword } = req.body as ChangePasswordRequest;
  const userId = req.user!.id;

  try {
    // Validate new password strength
    const passwordError = passwordService.validatePasswordStrength(newPassword);
    if (passwordError) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'VALIDATION_ERROR',
        logMessage: 'New password validation failed',
        context: { error: passwordError },
      });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'VALIDATION_ERROR',
        logMessage: 'New password must be different from current password',
        context: { userId },
      });
    }

    // Change password
    const success = await authProviderService.changePassword(
      userId,
      currentPassword,
      newPassword
    );

    if (!success) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INVALID_CREDENTIALS',
        logMessage: 'Current password is incorrect',
        context: { userId },
      });
    }

    logger.info('Password changed successfully', {
      traceId,
      userId,
    });

    res.status(200).json({
      ok: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Password change failed',
      context: {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
