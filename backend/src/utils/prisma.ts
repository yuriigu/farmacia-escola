import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// guardamos a instancia do prisma num slot global (globalThis) pra
// sobreviver a hot reload em dev. sem isso, cada recarga do servidor
// criaria uma nova instancia e estouraria o numero de conexoes.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// niveis de log do prisma. por padrao, so error. em dev, incluimos warn
// pra ajudar no debug local. em producao, so error mesmo, pra nao poluir.
let logOptions: ('error' | 'warn')[] = ['error'];
if (process.env.NODE_ENV === 'development') {
  logOptions = ['error', 'warn'];
} else {
  logOptions = ['error'];
}

// o prisma 7 exige um driver adapter em tempo de execucao.
// usamos o libsql (js puro, sem dependencia nativa) pra rodar bem
// em alpine/docker sem dor de cabeca com build. o timeout de operacao
// (p1008, operation timed out) nao cabe na config do libsql, entao
// e tratado via retry/backoff la no seed.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
});

// reaproveita a instancia do global se ja existir (caso do hot reload)
// e so cria uma nova quando for a primeira vez no processo.
let prismaClientInstance: PrismaClient;
if (globalForPrisma.prisma) {
  prismaClientInstance = globalForPrisma.prisma;
} else {
  prismaClientInstance = new PrismaClient({
    adapter,
    log: logOptions,
  });
}

// exporta a instancia do prisma. todo o resto do projeto importa
// esse singleton pra falar com o banco.
export const prisma = prismaClientInstance;

// so guarda a referencia no global fora de producao, porque o objetivo
// e sobreviver ao hot reload (que nao rola em prod). em prod, deixamos
// o gerenciamento de ciclo de vida limpo, sem sujar o global.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}