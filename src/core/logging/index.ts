import { config } from '../config/env';
import type { DatabaseLogEntry } from '../db/logger';

// Simple structured logger interface
interface LogContext {
  [key: string]: unknown;
}

// Interface for database logger to avoid circular imports
interface DatabaseLogger {
  storeLog(entry: DatabaseLogEntry): Promise<void>;
}

interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  setDatabaseLogger(dbLogger: DatabaseLogger): void;
}

// Singleton logger instance
let loggerInstance: Logger | null = null;
let databaseLogger: DatabaseLogger | null = null;

// Create structured JSON logger
const createLogger = (): Logger => {
  const log = (level: string, message: string, context?: LogContext) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'admin-backend',
      environment: config.NODE_ENV,
      ...context,
    };

    // Console logging
    if (config.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context ? context : '');
    } else {
      console.log(JSON.stringify(logEntry));
    }

    // Database logging (async, non-blocking)
    if (databaseLogger) {
      // Extract relevant fields for database storage
      const dbLogEntry: DatabaseLogEntry = {
        level,
        message,
        service: 'admin-backend',
        environment: config.NODE_ENV,
        context: context || undefined,
        traceId: context?.traceId as string | undefined,
        userId: (context?.userId as string) || (context?.adminUserId as string) || undefined,
      };

      // Store in database asynchronously without blocking
      databaseLogger.storeLog(dbLogEntry).catch((error: unknown) => {
        // Silently fail to avoid infinite loops
        console.error('Database logging failed:', error);
      });
    }
  };

  return {
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),
    debug: (message: string, context?: LogContext) => {
      if (config.NODE_ENV === 'development') {
        log('debug', message, context);
      }
    },
    setDatabaseLogger: (dbLogger: DatabaseLogger) => {
      databaseLogger = dbLogger;
    },
  };
};

// Ensure singleton pattern
export const logger = (() => {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
})();
