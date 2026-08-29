import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { prisma } from '../../../src/utils/prisma';
import { mockUser, mockUsersList } from '../../fixtures/users.fixture';

vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = new UserRepository();
  });

  it('deve buscar usuário por e-mail no Prisma', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await userRepo.findByEmail('admin@farmacia.ufba.br');

    expect(user).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@farmacia.ufba.br' },
      include: { patient: true },
    });
  });

  it('deve buscar usuário por ID no Prisma', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await userRepo.findById(1);

    expect(user).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { patient: true },
    });
  });

  it('deve listar todos os usuários no Prisma', async () => {
    (prisma.user.findMany as any).mockResolvedValue(mockUsersList);

    const users = await userRepo.findAll();

    expect(users).toEqual(mockUsersList);
    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  it('deve criar usuário no Prisma', async () => {
    (prisma.user.create as any).mockResolvedValue(mockUser);

    const created = await userRepo.create({
      name: 'Admin Teste',
      email: 'admin@farmacia.ufba.br',
      password: 'hashedpassword',
      role: 'ADMIN' as any,
    });

    expect(created).toEqual(mockUser);
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
