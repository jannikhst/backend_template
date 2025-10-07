import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '../../core/db/client';
import { logger } from '../../core/logging';
import { ApiKey, UserRole } from '@prisma/client';

// API key format validation regex: {username}_{128-hex} OR just {128-hex}
const API_KEY_REGEX = /^([a-z]{1,12}_)?[0-9a-f]{128}$/;

// API key with user information for authentication
export interface ApiKeyWithUser {
  id: string;
  userId: string;
  name: string | null;
  keyHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    roles: UserRole[];
    isActive: boolean;
  };
}

// API key metadata for listing (no sensitive data)
export interface ApiKeyMetadata {
  id: string;
  name: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  keyFingerprint: string; // Last 6 chars of hash for display
}

class ApiKeyService {
  // Extract username from email (best effort, fallback to empty)
  private extractUsername(email: string): string {
    try {
      const username = email.split('@')[0].toLowerCase();
      const cleanUsername = username.replace(/[^a-z]/g, '').substring(0, 12);
      return cleanUsername || '';
    } catch {
      return '';
    }
  }

  // Generate cryptographically secure API key
  private generateApiKey(username?: string): string {
    const tokenBody = randomBytes(64).toString('hex'); // 128 hex chars
    
    // If username is provided and valid, use it as prefix
    if (username && username.length > 0) {
      return `${username}_${tokenBody}`;
    }
    
    // Otherwise just return the token body
    return tokenBody;
  }

  // Hash entire API key with SHA-256
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  // Validate API key format
  private validateApiKeyFormat(apiKey: string): boolean {
    return API_KEY_REGEX.test(apiKey);
  }

  // Constant-time comparison for security
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const bufferA = Buffer.from(a, 'hex');
    const bufferB = Buffer.from(b, 'hex');
    
    return timingSafeEqual(bufferA, bufferB);
  }

  // Create new API key for user
  async createApiKey(
    userId: string,
    name?: string,
    expiresAt?: Date
  ): Promise<{ apiKey: ApiKey; plaintext: string }> {
    const traceId = `apikey-create-${Date.now()}`;
    
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is disabled');
      }

      // Try to extract username for prefix (optional)
      const username = this.extractUsername(user.email);
      const plaintext = this.generateApiKey(username);
      const keyHash = this.hashApiKey(plaintext);

      // Create API key record
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          name,
          keyHash,
          expiresAt,
        },
      });

      logger.info('API key created', {
        traceId,
        userId,
        apiKeyId: apiKey.id,
        keyFingerprint: keyHash.slice(-6),
        hasExpiration: !!expiresAt,
        hasUsernamePrefix: plaintext.includes('_'),
      });

      return { apiKey, plaintext };
    } catch (error) {
      logger.error('Failed to create API key', {
        traceId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Validate API key and return user information
  async validateApiKey(apiKey: string): Promise<ApiKeyWithUser | null> {
    const traceId = `apikey-validate-${Date.now()}`;
    
    try {
      // Fast format validation
      if (!this.validateApiKeyFormat(apiKey)) {
        logger.debug('Invalid API key format', { traceId });
        return null;
      }

      // Hash the entire key
      const keyHash = this.hashApiKey(apiKey);

      // Find API key with user data
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: {
          keyHash,
          user: {
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              roles: true,
              isActive: true,
            },
          },
        },
      });

      if (!apiKeyRecord) {
        logger.debug('API key not found or user inactive', { 
          traceId,
          keyFingerprint: keyHash.slice(-6),
        });
        return null;
      }

      // Check expiration
      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt <= new Date()) {
        logger.debug('API key expired', {
          traceId,
          apiKeyId: apiKeyRecord.id,
          expiresAt: apiKeyRecord.expiresAt,
        });
        return null;
      }

      // Constant-time comparison for additional security
      if (!this.constantTimeCompare(keyHash, apiKeyRecord.keyHash)) {
        logger.warn('API key hash mismatch', { traceId });
        return null;
      }

      logger.debug('API key validated successfully', {
        traceId,
        userId: apiKeyRecord.userId,
        apiKeyId: apiKeyRecord.id,
      });

      return apiKeyRecord as ApiKeyWithUser;
    } catch (error) {
      logger.error('API key validation error', {
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Update last used timestamp
  async updateLastUsed(apiKeyId: string): Promise<void> {
    try {
      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      logger.error('Failed to update API key last used', {
        apiKeyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is not critical for authentication
    }
  }

  // List user's API keys (no sensitive data)
  async listUserApiKeys(userId: string): Promise<ApiKeyMetadata[]> {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          keyHash: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        keyFingerprint: key.keyHash.slice(-6), // Last 6 chars for display
      }));
    } catch (error) {
      logger.error('Failed to list user API keys', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to list API keys');
    }
  }

  // Delete API key
  async deleteApiKey(apiKeyId: string, userId: string): Promise<void> {
    try {
      const result = await prisma.apiKey.deleteMany({
        where: {
          id: apiKeyId,
          userId, // Ensure user can only delete their own keys
        },
      });

      if (result.count === 0) {
        throw new Error('API key not found or access denied');
      }

      logger.info('API key deleted', {
        apiKeyId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete API key', {
        apiKeyId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Delete all API keys for a user
  async deleteAllUserApiKeys(userId: string): Promise<number> {
    try {
      const result = await prisma.apiKey.deleteMany({
        where: { userId },
      });

      logger.info('All user API keys deleted', {
        userId,
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete all user API keys', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to delete API keys');
    }
  }

  // Cleanup expired API keys (can be called periodically)
  async cleanupExpiredApiKeys(): Promise<number> {
    try {
      const result = await prisma.apiKey.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      if (result.count > 0) {
        logger.info('Expired API keys cleaned up', {
          deletedCount: result.count,
        });
      }

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired API keys', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
