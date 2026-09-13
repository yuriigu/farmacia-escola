import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let logOptions: ('error' | 'warn')[] = ['error'];
if (process.env.NODE_ENV === 'development') {
  logOptions = ['error', 'warn'];
} else {
  logOptions = ['error'];
}

// Prisma 7 requer um driver adapter para conexões em runtime.
// Usa LibSQL (pure JS, sem dependências nativas) para compatibilidade com Alpine/Docker.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
});

let prismaClientInstance: PrismaClient;
if (globalForPrisma.prisma) {
  prismaClientInstance = globalForPrisma.prisma;
} else {
  prismaClientInstance = new PrismaClient({
    adapter,
    log: logOptions,
  });
}

export const prisma = prismaClientInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}