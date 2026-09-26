import { vi, beforeEach } from 'vitest';

// setup global de testes. e carregado antes de qualquer teste rodar,
// entao e aqui que a gente:
// 1) fixa envs obrigatorias (jwt_secret, jwt_expires_in, node_env)
//    pra o boot da aplicacao nao quebrar e o comportamento ficar
//    deterministico.
// 2) mocka o @prisma/client inteiro, substituindo o client real por
//    uma classe falsa com os models e metodos que os testes usam.
// 3) limpa os mocks entre testes.
// isso evita subir sqlite de verdade e deixa os testes rapidos e
// previsiveis.

// envs fixadas pros testes. jwt_secret precisa existir porque o
// utils/jwt derruba a aplicacao se ele faltar. node_env=test tambem
// desliga o rate limit e nao sobe o servidor.
vi.stubEnv('JWT_SECRET', 'test-secret-key-12345');
vi.stubEnv('JWT_EXPIRES_IN', '1d');
vi.stubEnv('NODE_ENV', 'test');

// mock do prisma client. a classe falsa replica o $transaction
// (so chama o callback com o proprio this) e expoe os models com
// os metodos mais comuns ja mockados como vi.fn().
// qualquer teste que precise de um metodo especifico so faz
// mockresolvedvalue em cima do vi.fn() correspondente.
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      // o $transaction chama o callback com o proprio this, entao
      // os testes que usam transacao enxergam os mesmos mocks que
      // estao no client de fora.
      $transaction = vi.fn(async (cb: any) => cb(this));
      user = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      patient = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      medicine = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      batch = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      };
      stockBatch = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      };
      // query raw usada em alguns fluxos (ex: fallback de cpf).
      // por padrao devolve array vazio.
      $queryRawUnsafe = vi.fn().mockResolvedValue([]);
      appointment = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      appointmentItem = {
        createMany: vi.fn(),
      };
      scheduleSlot = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      disposal = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      };
      activityLog = {
        findMany: vi.fn(),
        create: vi.fn(),
      };
    },
    // enums do prisma replicados aqui porque o @prisma/client original
    // traz isso junto e alguns modulos importam daqui.
    Role: {
      ADMIN: 'ADMIN',
      FARMACEUTICO: 'FARMACEUTICO',
      ALUNO: 'ALUNO',
      MEDICO: 'MEDICO',
      PACIENTE: 'PACIENTE',
    },
    Prisma: {
      TransactionIsolationLevel: {
        Serializable: 'Serializable',
      },
    },
  };
});

// limpa contagem de chamadas entre testes, garantindo isolamento
// entre casos (cada um comeca com os mocks zerados).
beforeEach(() => {
  vi.clearAllMocks();
});