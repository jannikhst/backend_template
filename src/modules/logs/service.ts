import { createDatabaseLoggerService } from '../../core/db/logger';
import { logger } from '../../core/logging';

// Log cleanup scheduler service
class LogCleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private databaseLoggerService: ReturnType<typeof createDatabaseLoggerService>;
  private cleanupIntervalMs: number;
  private daysToKeep: number;

  constructor(
    databaseLoggerService: ReturnType<typeof createDatabaseLoggerService>,
    cleanupIntervalHours: number = 24, // Run cleanup every 24 hours by default
    daysToKeep: number = 7 // Keep logs for 7 days by default
  ) {
    this.databaseLoggerService = databaseLoggerService;
    this.cleanupIntervalMs = cleanupIntervalHours * 60 * 60 * 1000;
    this.daysToKeep = daysToKeep;
  }

  // Start the cleanup scheduler
  start(): void {
    if (this.intervalId) {
      logger.warn('Log cleanup scheduler is already running');
      return;
    }

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule recurring cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.cleanupIntervalMs);

    logger.info('Log cleanup scheduler started', {
      cleanupIntervalHours: this.cleanupIntervalMs / (60 * 60 * 1000),
      daysToKeep: this.daysToKeep,
    });
  }

  // Stop the cleanup scheduler
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Log cleanup scheduler stopped');
    }
  }

  // Run the cleanup process
  private async runCleanup(): Promise<void> {
    try {
      const deletedCount = await this.databaseLoggerService.cleanupOldLogs(this.daysToKeep);
      
      if (deletedCount > 0) {
        logger.info('Log cleanup completed', {
          deletedCount,
          daysToKeep: this.daysToKeep,
        });
      } else {
        logger.debug('Log cleanup completed - no old logs to delete', {
          daysToKeep: this.daysToKeep,
        });
      }
    } catch (error) {
      // Don't use logger.error here to avoid potential circular issues
      // Just log to console directly
      console.error('Log cleanup failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Manual cleanup trigger
  async triggerCleanup(): Promise<number> {
    try {
      const deletedCount = await this.databaseLoggerService.cleanupOldLogs(this.daysToKeep);
      logger.info('Manual log cleanup completed', {
        deletedCount,
        daysToKeep: this.daysToKeep,
      });
      return deletedCount;
    } catch (error) {
      logger.error('Manual log cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        daysToKeep: this.daysToKeep,
      });
      throw error;
    }
  }

  // Get scheduler status
  getStatus(): { isRunning: boolean; cleanupIntervalHours: number; daysToKeep: number } {
    return {
      isRunning: this.intervalId !== null,
      cleanupIntervalHours: this.cleanupIntervalMs / (60 * 60 * 1000),
      daysToKeep: this.daysToKeep,
    };
  }
}

export { LogCleanupScheduler };
