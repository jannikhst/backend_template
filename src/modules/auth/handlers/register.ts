import { Request, Response } from 'express';
import { prisma } from '../../../core/db/client';
import { sessionService } from '../../../core/services/sessionService';
import { authProviderService } from '../../../core/services/authProviderService';
import { passwordService } from '../../../core/services/passwordService';
import { config } from '../../../core/config/env';
import { logger } from '../../../core/logging';
import { sendErrorResponse } from '../../../core/http/middleware/errorHandler';
import { UserRole } from '@prisma/client';
import type { RegisterRequest } from '../schema';
import { getRealClientIp } from '../../../core/http/middleware/cloudflare';

export async function registerHandler(req: Request, res: Response) {
  const traceId = res.locals.traceId || 'unknown';
  const { email, password, name } = req.body as RegisterRequest;

  try {
    // Validate password strength
    const passwordError = passwordService.validatePasswordStrength(password);
    if (passwordError) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'VALIDATION_ERROR',
        logMessage: 'Password validation failed',
        context: { error: passwordError },
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'VALIDATION_ERROR',
        logMessage: 'User already exists',
        context: { email },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        roles: [config.DEFAULT_ROLE as UserRole],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        isActive: true,
      },
    });

    // Create email/password auth provider
    await authProviderService.createEmailPasswordProvider(user.id, password);

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

    logger.info('User registered successfully', {
      traceId,
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
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
      logMessage: 'Registration failed',
      context: {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
