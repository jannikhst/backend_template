import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../core/db/client';
import { sessionService } from '../../../../core/services/sessionService';
import { config } from '../../../../core/config/env';
import {
  getGoogleClient,
  validateOAuthState,
  fetchGoogleUserProfile,
  normalizeGoogleUser
} from '../../../../core/services/oauthService';
import { logger } from '../../../../core/logging';
import { AppError } from '../../../../core/http/middleware/errorHandler';
import { UserRole } from '@prisma/client';
import { getRealClientIp } from '../../../../core/http/middleware/cloudflare';

/**
 * Handle Google OAuth callback
 * GET /auth/google/callback
 */
export async function googleCallbackHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Handle OAuth errors
    if (error) {
      logger.warn('Google OAuth error', { error, error_description });
      throw new AppError(`OAuth failed: ${error_description || error}`, 400, 'OAUTH_ERROR');
    }
    
    // Validate required parameters
    if (!code || typeof code !== 'string') {
      throw new AppError('Missing authorization code', 400, 'VALIDATION_ERROR');
    }
    
    if (!state || typeof state !== 'string') {
      throw new AppError('Missing state parameter', 400, 'VALIDATION_ERROR');
    }
    
    // Validate state (CSRF protection)
    const stateData = await validateOAuthState(state);
    if (!stateData || stateData.provider !== 'google') {
      throw new AppError('Invalid or expired state parameter', 400, 'INVALID_STATE');
    }
    
    if (!stateData.codeVerifier) {
      throw new AppError('Missing code verifier', 400, 'INVALID_STATE');
    }
    
    // Exchange code for tokens
    const google = getGoogleClient();
    const tokens = await google.validateAuthorizationCode(code, stateData.codeVerifier);
    
    // Fetch user profile
    const profile = await fetchGoogleUserProfile(tokens.accessToken());
    const normalizedUser = normalizeGoogleUser(profile);
    
    logger.info('Google OAuth profile fetched', {
      email: normalizedUser.email,
      providerId: normalizedUser.providerId
    });
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedUser.email }
    });
    
    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: normalizedUser.email,
          name: normalizedUser.name,
          roles: [config.DEFAULT_ROLE] as UserRole[]
        }
      });
      
      logger.info('New user created via Google OAuth', {
        userId: user.id,
        email: user.email
      });
    }
    
    // Find or create auth provider
    let authProvider = await prisma.authProvider.findFirst({
      where: {
        userId: user.id,
        type: 'GOOGLE'
      }
    });
    
    if (!authProvider) {
      authProvider = await prisma.authProvider.create({
        data: {
          userId: user.id,
          type: 'GOOGLE',
          providerId: normalizedUser.providerId
        }
      });
      
      logger.info('Google auth provider linked', {
        userId: user.id,
        providerId: normalizedUser.providerId
      });
    } else {
      // Update provider ID if changed
      if (authProvider.providerId !== normalizedUser.providerId) {
        await prisma.authProvider.update({
          where: { id: authProvider.id },
          data: { providerId: normalizedUser.providerId }
        });
      }
    }
    
    // Create session
    const session = await sessionService.createSession(
      user.id,
      user.roles,
      {
        ip: getRealClientIp(req),
        userAgent: req.get('user-agent')
      }
    );
    
    // Set session cookie
    res.cookie(config.SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAMESITE,
      maxAge: config.SESSION_TTL_SECONDS * 1000
    });
    
    logger.info('Google OAuth login successful', {
      userId: user.id,
      sessionId: session
    });
    
    // Redirect to frontend
    // TODO: Make this configurable
    res.redirect('/');
  } catch (error) {
    logger.error('Google OAuth callback failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
}
