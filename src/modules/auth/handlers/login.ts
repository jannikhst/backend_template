import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { sessionService } from '../../../core/services/sessionService';
import { authProviderService } from '../../../core/services/authProviderService';
import { config } from '../../../core/config/env';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import type { LoginRequest } from '../schema';
import { getRealClientIp } from '../../../core/http/middleware/cloudflare';

export async function loginHandler(req: Request, res: Response) {
  const traceId = res.locals.traceId || 'unknown';
  const { email, password } = req.body as LoginRequest;

  try {
    // Verify credentials
    const authResult = await authProviderService.verifyEmailPassword(email, password);

    if (!authResult) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INVALID_CREDENTIALS',
        logMessage: 'Invalid login credentials',
        context: { email },
      });
    }

    // Get full user details
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
      },
    });

    if (!user) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'User not found after authentication',
        context: { userId: authResult.userId },
      });
    }

    // Get client metadata
    const ip = getRealClientIp(req);
    const userAgent = req.headers['user-agent'];
    const country = req.headers['cf-ipcountry'] as string | undefined;

    // Create session
    const sessionToken = await sessionService.createSession(
      user.id,
      user.roles,
      { ip, userAgent, country }
    );

    // Get session details
    const session = await sessionService.getSession(sessionToken);
    if (!session) {
      throw new Error('Failed to create session');
    }

    // Set session cookie
    res.cookie(config.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAMESITE,
      maxAge: config.SESSION_TTL_SECONDS * 1000,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in successfully', {
      traceId,
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        isActive: user.isActive,
      },
      session: {
        createdAt: new Date(session.createdAt * 1000).toISOString(),
        expiresAt: new Date(session.exp * 1000).toISOString(),
      },
    });
  } catch (error) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'INTERNAL_ERROR',
      logMessage: 'Login failed',
      context: {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
