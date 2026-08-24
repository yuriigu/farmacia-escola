import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.warn('[AI Studio] Database not connected — using mock fallback', error);
    const noOp = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
      count: async () => 0,
    };
    return new Proxy({}, {
      get: () => new Proxy(noOp, {
        get: (target, prop) => {
          if (prop in target) return (target as any)[prop];
          return async () => null;
        }
      })
    }) as unknown as PrismaClient;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

