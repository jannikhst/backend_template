import { PrismaClient } from '@prisma/client';
import { logger } from '../logging';
// Singleton Prisma client instance
let prismaInstance: ReturnType<typeof createPrismaClient> | null = null;

function createPrismaClient() {
  const baseClient = new PrismaClient();
  // space for extensions if needed in the future
  return baseClient;
}

export const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
    logger.debug('Prisma client instance created');
  }

  return prismaInstance;
};

// Export singleton instance
export const prisma = getPrismaClient();
