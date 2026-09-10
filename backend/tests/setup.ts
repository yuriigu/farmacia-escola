import { vi, beforeEach } from 'vitest';

vi.stubEnv('JWT_SECRET', 'test-secret-key-12345');
vi.stubEnv('JWT_EXPIRES_IN', '1d');
vi.stubEnv('NODE_ENV', 'test');

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
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
      withdrawal = {
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

beforeEach(() => {
  vi.clearAllMocks();
});