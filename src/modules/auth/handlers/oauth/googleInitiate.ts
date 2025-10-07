import { Request, Response, NextFunction } from 'express';
import { generateCodeVerifier } from 'arctic';
import { getGoogleClient, generateOAuthState } from '../../../../core/services/oauthService';
import { logger } from '../../../../core/logging';
import { getRealClientIp } from '../../../../core/http/middleware/cloudflare';

/**
 * Initiate Google OAuth flow
 * GET /auth/google
 */
export async function googleInitiateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Generate code verifier for PKCE
    const codeVerifier = generateCodeVerifier();
    
    // Generate and store state with code verifier
    const state = await generateOAuthState('google', codeVerifier);
    
    // Get Google OAuth client
    const google = getGoogleClient();
    
    // Create authorization URL
    const scopes = ['email', 'profile'];
    const url = await google.createAuthorizationURL(state, codeVerifier, scopes);
    
    logger.info('Google OAuth initiated', {
      ip: getRealClientIp(req),
      userAgent: req.get('user-agent')
    });
    
    // Redirect to Google
    res.redirect(url.toString());
  } catch (error) {
    logger.error('Google OAuth initiate failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
}
