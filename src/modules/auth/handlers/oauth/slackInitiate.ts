import { Request, Response, NextFunction } from 'express';
import { getSlackClient, generateOAuthState } from '../../../../core/services/oauthService';
import { logger } from '../../../../core/logging';
import { getRealClientIp } from '../../../../core/http/middleware/cloudflare';

/**
 * Initiate Slack OAuth flow
 * GET /auth/slack
 */
export async function slackInitiateHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Generate and store state for CSRF protection
    const state = await generateOAuthState('slack');
    
    // Get Slack OAuth client
    const slack = getSlackClient();
    
    // Create authorization URL
    const url = await slack.createAuthorizationURL(state, ['identity.basic', 'identity.email']);
    
    logger.info('Slack OAuth initiated', {
      ip: getRealClientIp(req),
      userAgent: req.get('user-agent')
    });
    
    // Redirect to Slack
    res.redirect(url.toString());
  } catch (error) {
    logger.error('Slack OAuth initiate failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
}
