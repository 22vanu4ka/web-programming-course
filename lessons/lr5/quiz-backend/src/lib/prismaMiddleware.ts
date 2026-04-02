import { PrismaClient } from '@prisma/client';

export function addQueryLogging(prisma: PrismaClient) {
  (prisma as any).$use(async (params: any, next: (params: any) => Promise<any>) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log(`🐢 Slow query (${duration}ms): ${params.model}.${params.action} - ${JSON.stringify(params.args).slice(0, 200)}`);
    }
    return result;
  });
}