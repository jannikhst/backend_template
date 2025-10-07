import bcrypt from 'bcrypt';
import { logger } from '../logging';

const SALT_ROUNDS = 12;

class PasswordService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      return hash;
    } catch (error) {
      logger.error('Failed to hash password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      logger.error('Failed to verify password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate password strength
   * Returns null if valid, error message if invalid
   */
  validatePasswordStrength(password: string): string | null {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (password.length > 128) {
      return 'Password must not exceed 128 characters';
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter';
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }

    return null;
  }
}

export const passwordService = new PasswordService();
