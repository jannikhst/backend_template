import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/env';
import { logger } from '../../logging';
import { cloudflareIpService } from '../../services/cloudflareIpService';
import { sendErrorResponse } from './errorHandler';

/**
 * Simple middleware to extract real client IP and country from Cloudflare headers
 * Only active when BEHIND_CLOUDFLARE environment flag is true
 */
export function extractCloudflareInfo(req: Request, res: Response, next: NextFunction) {
  // Use CF-Ray as trace ID fallback if no trace ID exists
  const cfRay = req.headers['cf-ray'] as string;
  const traceId = res.locals.traceId || cfRay || 'unknown';
  
  // Update trace ID if we used CF-Ray
  if (!res.locals.traceId && cfRay) {
    res.locals.traceId = cfRay;
    res.setHeader('X-Trace-ID', cfRay);
  }
  
  // Only process if behind Cloudflare
  if (!config.BEHIND_CLOUDFLARE) {
    return next();
  }
  
  try {
    // Store original IP for logging and validation
    const originalIp = req.headers['x-real-ip'] as string || req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
    
    // Validate that the request comes from Cloudflare
    if (!cloudflareIpService.isCloudflareIp(originalIp)) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INVALID_PROXY',
        logMessage: 'Request not from Cloudflare IP blocked',
        context: {
          originalIp,
          userAgent: req.headers['user-agent'],
        },
      });
    }
    
    // Extract Cloudflare headers
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    const cfIpCountry = req.headers['cf-ipcountry'] as string;
    
    // Validate that we have the expected Cloudflare headers
    if (!cfConnectingIp) {
      return sendErrorResponse({
        req,
        res,
        errorCode: 'MISSING_CLOUDFLARE_HEADERS',
        logMessage: 'Missing cf-connecting-ip header from Cloudflare request',
        context: { originalIp },
      });
    }
    
    // Store real client IP in custom property
    req.realIp = cfConnectingIp;
    
    // Add country to request if available
    if (cfIpCountry) {
      req.country = cfIpCountry;
    }
    
    logger.debug('Cloudflare IP extracted and validated', {
      traceId,
      originalIp,
      realIp: cfConnectingIp,
      country: cfIpCountry,
      cfRay,
      path: req.path,
    });
    
    next();
  } catch (error) {
    logger.error('Error in Cloudflare IP extraction', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });
    
    // Don't fail the request, just continue
    next();
  }
}

/**
 * Utility function to get the real client IP from request
 * Returns the Cloudflare-extracted IP if available, otherwise falls back to Express default
 */
export function getRealClientIp(req: Request): string {
  return req.realIp || req.ip || 'unknown';
}

/**
 * Utility function to get the client country from request
 */
export function getClientCountry(req: Request): string | undefined {
  return req.country;
}
