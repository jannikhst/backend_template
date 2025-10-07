import { AuthProviderType } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../logging';
import { passwordService } from './passwordService';

class AuthProviderService {
  /**
   * Create an email/password auth provider for a user
   */
  async createEmailPasswordProvider(
    userId: string,
    password: string
  ): Promise<void> {
    try {
      const passwordHash = await passwordService.hashPassword(password);

      await prisma.authProvider.create({
        data: {
          userId,
          type: AuthProviderType.EMAIL_PASSWORD,
          passwordHash,
        },
      });

      logger.info('Email/password provider created', { userId });
    } catch (error) {
      logger.error('Failed to create email/password provider', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to create authentication provider');
    }
  }

  /**
   * Verify email/password credentials
   */
  async verifyEmailPassword(
    email: string,
    password: string
  ): Promise<{ userId: string; roles: string[] } | null> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          authProviders: {
            where: {
              type: AuthProviderType.EMAIL_PASSWORD,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        logger.warn('Login attempt for non-existent or inactive user', { email });
        return null;
      }

      // Check if user has email/password provider
      const emailProvider = user.authProviders[0];
      if (!emailProvider || !emailProvider.passwordHash) {
        logger.warn('User has no email/password provider', { email, userId: user.id });
        return null;
      }

      // Verify password
      const isValid = await passwordService.verifyPassword(
        password,
        emailProvider.passwordHash
      );

      if (!isValid) {
        logger.warn('Invalid password attempt', { email, userId: user.id });
        return null;
      }

      logger.info('Email/password authentication successful', {
        userId: user.id,
        email,
      });

      return {
        userId: user.id,
        roles: user.roles,
      };
    } catch (error) {
      logger.error('Email/password verification error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Change password for a user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Get user's email/password provider
      const provider = await prisma.authProvider.findUnique({
        where: {
          userId_type: {
            userId,
            type: AuthProviderType.EMAIL_PASSWORD,
          },
        },
      });

      if (!provider || !provider.passwordHash) {
        logger.warn('User has no email/password provider', { userId });
        return false;
      }

      // Verify current password
      const isValid = await passwordService.verifyPassword(
        currentPassword,
        provider.passwordHash
      );

      if (!isValid) {
        logger.warn('Invalid current password', { userId });
        return false;
      }

      // Hash new password
      const newPasswordHash = await passwordService.hashPassword(newPassword);

      // Update password
      await prisma.authProvider.update({
        where: { id: provider.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      logger.info('Password changed successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to change password', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * List all auth providers for a user
   */
  async listUserProviders(userId: string) {
    try {
      const providers = await prisma.authProvider.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          providerId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return providers;
    } catch (error) {
      logger.error('Failed to list user providers', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to list authentication providers');
    }
  }

  /**
   * Check if user has a specific provider type
   */
  async hasProvider(userId: string, type: AuthProviderType): Promise<boolean> {
    try {
      const provider = await prisma.authProvider.findUnique({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
      });

      return !!provider;
    } catch (error) {
      logger.error('Failed to check provider', {
        userId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export const authProviderService = new AuthProviderService();
