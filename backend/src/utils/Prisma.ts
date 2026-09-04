import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let logOptions: ('error' | 'warn')[] = ['error'];
if (process.env.NODE_ENV === 'development') {
  logOptions = ['error', 'warn'];
} else {
  logOptions = ['error'];
}

let prismaClientInstance: PrismaClient;
if (globalForPrisma.prisma) {
  prismaClientInstance = globalForPrisma.prisma;
} else {
  prismaClientInstance = new PrismaClient({
    log: logOptions,
  });
}

export const prisma = prismaClientInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}