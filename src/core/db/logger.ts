// Interface for database log entry
interface DatabaseLogEntry {
  level: string;
  message: string;
  service: string;
  environment?: string;
  context?: unknown;
  traceId?: string;
  userId?: string;
}

// Interface for the minimal Prisma client methods we need
interface LogPrismaClient {
  logEntry: {
    create: (args: { data: unknown }) => Promise<unknown>;
    deleteMany: (args: { where: { timestamp: { lt: Date } } }) => Promise<{ count: number }>;
  };
}

// Database logger service
class DatabaseLoggerService {
  private prisma: LogPrismaClient;
  private isEnabled: boolean = true;
  private hasLoggedDisableWarning: boolean = false;

  constructor(prismaClient: LogPrismaClient) {
    this.prisma = prismaClient;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async storeLog(entry: DatabaseLogEntry): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.prisma.logEntry.create({
        data: {
          level: entry.level,
          message: entry.message,
          service: entry.service,
          environment: entry.environment,
          context: entry.context,
          traceId: entry.traceId,
          userId: entry.userId,
        },
      });
    } catch (error) {
      // Disable if database unavailable
      if (error instanceof Error && error.message.includes("Can't reach database")) {
        this.setEnabled(false);
        if (!this.hasLoggedDisableWarning) {
          console.warn('Database logging disabled due to connection issues');
          this.hasLoggedDisableWarning = true;
        }
      }
    }
  }

  async cleanupOldLogs(daysToKeep: number = 7): Promise<number> {
    if (!this.isEnabled) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.logEntry.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Can't reach database")) {
        this.setEnabled(false);
        if (!this.hasLoggedDisableWarning) {
          console.warn('Database logging disabled due to connection issues');
          this.hasLoggedDisableWarning = true;
        }
      }
      return 0;
    }
  }
}

export const createDatabaseLoggerService = (prismaClient: LogPrismaClient) => {
  return new DatabaseLoggerService(prismaClient);
};

export type { DatabaseLogEntry };
