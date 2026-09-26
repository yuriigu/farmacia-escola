import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '../../../src/repositories/user-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockUser, mockUsersList } from '../../fixtures/users-fixture';

// mockamos o prisma pra isolar o repositorio. o foco aqui e o que o
// repositorio pede pro banco (quais metodos, com qual where e include)
// e o que ele devolve. a regra de negocio (validacao, hash de senha,
// permissoes por papel) fica no service, nao entra.
// o mock do $transaction chama o callback com o proprio mock, pra os
// testes de fluxo transacional (create do user + patient) funcionarem
// sem setup extra.
vi.mock('../../../src/utils/prisma', () => {
  const prismaMock: any = {
    $transaction: vi.fn((cb: any) => cb(prismaMock)),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    patient: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    prisma: prismaMock,
  };
});

// testes do user-repository.
// cobrem busca por email, busca por id, listagem e criacao.
describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre os testes.
    vi.clearAllMocks();
    userRepo = new UserRepository();
  });

  // verifica que o findbyemail chama o findunique com o email certo
  // e traz o paciente vinculado junto (include patient).
  it('deve buscar usuário por e-mail no Prisma', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await userRepo.findByEmail('admin@farmacia.ufba.br');

    expect(user).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@farmacia.ufba.br' },
      include: { patient: true },
    });
  });

  // mesma checagem do teste anterior, mas por id.
  it('deve buscar usuário por ID no Prisma', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const user = await userRepo.findById(1);

    expect(user).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { patient: true },
    });
  });

  // verifica que o findall chama o findmany e devolve o resultado
  // sem transformacao no repositorio.
  it('deve listar todos os usuários no Prisma', async () => {
    (prisma.user.findMany as any).mockResolvedValue(mockUsersList);

    const users = await userRepo.findAll();

    expect(users).toEqual(mockUsersList);
    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  // verifica que o create passa pelo prisma. aqui a gente define um
  // retorno enxuto (sem patient) porque e o formato que o repositorio
  // devolve quando nao cria paciente vinculado.
  it('deve criar usuário no Prisma', async () => {
    const createdMockUser = {
      id: 1,
      name: 'Admin Teste',
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN' as const,
      registerDoc: null,
      phone: null,
      active: true,
      permissions: null,
      createdAt: mockUser.createdAt,
      patient: null,
    };
    (prisma.user.create as any).mockResolvedValue(createdMockUser);

    const created = await userRepo.create({
      name: 'Admin Teste',
      email: 'admin@farmacia.ufba.br',
      password: 'hashedpassword',
      role: 'ADMIN' as any,
    });

    expect(created).toEqual(createdMockUser);
    expect(prisma.user.create).toHaveBeenCalled();
  });
});