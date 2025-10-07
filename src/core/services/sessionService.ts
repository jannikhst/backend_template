import { createClient, RedisClientType } from 'redis';
import { randomBytes } from 'crypto';
import { config } from '../config/env';
import { logger } from '../logging';
import { UserRole } from '@prisma/client';

// Session payload stored in Redis
export interface SessionPayload {
  uid: string;
  roles: UserRole[];
  exp: number;
  createdAt: number;
  lastUsedAt: number;
  ip?: string;
  userAgent?: string;
  country?: string;
}

// Session metadata for listing
export interface SessionMetadata {
  tokenId: string;
  tokenIdHash: string; // First 8 chars for display
  createdAt: Date;
  lastUsedAt: Date;
  ip?: string;
  userAgent?: string;
  country?: string;
}

class SessionService {
  private redis: RedisClientType;
  private isConnected = false;

  constructor() {
    this.redis = createClient({
      url: config.REDIS_URL,
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message, source: 'SessionService' });
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected for session storage');
    });

    this.redis.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('Redis disconnected');
    });
  }

  // Initialize Redis connection
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redis.connect();
    }
  }

  // Generate cryptographically secure session token
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex'); // 64 character hex string
  }

  // Create new session
  async createSession(
    userId: string,
    roles: UserRole[],
    metadata?: { ip?: string; userAgent?: string; country?: string }
  ): Promise<string> {
    const tokenId = this.generateSessionToken();
    const now = Math.floor(Date.now() / 1000);
    
    const sessionPayload: SessionPayload = {
      uid: userId,
      roles,
      exp: now + config.SESSION_TTL_SECONDS,
      createdAt: now,
      lastUsedAt: now,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      country: metadata?.country,
    };

    const sessionKey = `sess:${tokenId}`;
    const userSessionsKey = `user:${userId}:sessions`;

    try {
      // Store session with TTL
      await this.redis.setEx(
        sessionKey,
        config.SESSION_TTL_SECONDS,
        JSON.stringify(sessionPayload)
      );

      // Add to user's session set
      await this.redis.sAdd(userSessionsKey, tokenId);
      await this.redis.expire(userSessionsKey, config.SESSION_TTL_SECONDS);

      logger.info('Session created', { 
        userId, 
        tokenIdHash: tokenId.substring(0, 8),
        ttl: config.SESSION_TTL_SECONDS 
      });

      return tokenId;
    } catch (error) {
      logger.error('Failed to create session', { 
        userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Session creation failed');
    }
  }

  // Get and validate session with sliding expiration
  async getSession(tokenId: string): Promise<SessionPayload | null> {
    const sessionKey = `sess:${tokenId}`;

    try {
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session: SessionPayload = JSON.parse(sessionData);
      const now = Math.floor(Date.now() / 1000);

      // Check if session is expired
      if (session.exp <= now) {
        await this.deleteSession(tokenId);
        return null;
      }

      // Implement sliding expiration
      const timeSinceLastUse = now - session.lastUsedAt;
      if (timeSinceLastUse >= config.SESSION_SLIDING_EXTENSION_SECONDS) {
        session.lastUsedAt = now;
        session.exp = now + config.SESSION_TTL_SECONDS;

        // Update session in Redis
        await this.redis.setEx(
          sessionKey,
          config.SESSION_TTL_SECONDS,
          JSON.stringify(session)
        );

        logger.debug('Session extended', { 
          tokenIdHash: tokenId.substring(0, 8),
          newExp: session.exp 
        });
      }

      return session;
    } catch (error) {
      logger.error('Failed to get session', { 
        tokenIdHash: tokenId.substring(0, 8),
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  // Delete specific session
  async deleteSession(tokenId: string): Promise<void> {
    const sessionKey = `sess:${tokenId}`;

    try {
      // Get session to find user ID
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session: SessionPayload = JSON.parse(sessionData);
        const userSessionsKey = `user:${session.uid}:sessions`;
        
        // Remove from user's session set
        await this.redis.sRem(userSessionsKey, tokenId);
      }

      // Delete session
      await this.redis.del(sessionKey);

      logger.info('Session deleted', { tokenIdHash: tokenId.substring(0, 8) });
    } catch (error) {
      logger.error('Failed to delete session', { 
        tokenIdHash: tokenId.substring(0, 8),
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Session deletion failed');
    }
  }

  // Delete all sessions for a user
  async deleteAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = `user:${userId}:sessions`;

    try {
      const sessionTokens = await this.redis.sMembers(userSessionsKey);
      
      if (sessionTokens.length > 0) {
        // Delete all session keys
        const sessionKeys = sessionTokens.map(token => `sess:${token}`);
        await this.redis.del(sessionKeys);
        
        // Clear user's session set
        await this.redis.del(userSessionsKey);

        logger.info('All user sessions deleted', { 
          userId, 
          sessionCount: sessionTokens.length 
        });
      }
    } catch (error) {
      logger.error('Failed to delete all user sessions', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Session deletion failed');
    }
  }

  // List all active sessions for a user
  async listUserSessions(userId: string): Promise<SessionMetadata[]> {
    const userSessionsKey = `user:${userId}:sessions`;

    try {
      const sessionTokens = await this.redis.sMembers(userSessionsKey);
      const sessions: SessionMetadata[] = [];

      for (const tokenId of sessionTokens) {
        const sessionKey = `sess:${tokenId}`;
        const sessionData = await this.redis.get(sessionKey);
        
        if (sessionData) {
          const session: SessionPayload = JSON.parse(sessionData);
          
          sessions.push({
            tokenId,
            tokenIdHash: tokenId.substring(0, 8) + '...',
            createdAt: new Date(session.createdAt * 1000),
            lastUsedAt: new Date(session.lastUsedAt * 1000),
            ip: session.ip,
            userAgent: session.userAgent,
            country: session.country,
          });
        }
      }

      return sessions.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());
    } catch (error) {
      logger.error('Failed to list user sessions', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error('Session listing failed');
    }
  }

  // Cleanup expired sessions (can be called periodically)
  async cleanupExpiredSessions(): Promise<void> {
    // This is handled automatically by Redis TTL, but we could implement
    // additional cleanup logic here if needed
    logger.debug('Session cleanup completed (handled by Redis TTL)');
  }

  // Close Redis connection
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.disconnect();
      logger.info('Redis disconnected');
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();
