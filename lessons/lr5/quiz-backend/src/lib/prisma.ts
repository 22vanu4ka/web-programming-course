import { PrismaClient } from '@prisma/client';
import { addQueryLogging } from './prismaMiddleware.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  // addQueryLogging(prisma); // логируем медленные запросы в разработке
}