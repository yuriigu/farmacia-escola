import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../../src/services/UserService';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { mockUser, mockUsersList } from '../../fixtures/Users.fixture';

vi.mock('../../../src/repositories/UserRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    (UserRepository as any).mockImplementation(function () {
      return mockUserRepo;
    });

    userService = new UserService();
  });

  it('deve listar todos os usuários', async () => {
    mockUserRepo.findAll.mockResolvedValue(mockUsersList);

    const users = await userService.getAllUsers();

    expect(users).toEqual(mockUsersList);
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar usuário por ID', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);

    const user = await userService.getUserById(1);

    expect(user.id).toBe(mockUser.id);
    expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
  });

  it('deve lançar erro ao buscar usuário inexistente', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(userService.getUserById(999)).rejects.toEqual(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  it('deve atualizar dados do usuário com sucesso', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue({ ...mockUser, name: 'Nome Atualizado' });

    const updated = await userService.updateUser(1, 1, { name: 'Nome Atualizado' });

    expect(updated.name).toBe('Nome Atualizado');
    expect(mockUserRepo.update).toHaveBeenCalled();
  });

  it('deve deletar usuário existente', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.delete.mockResolvedValue(mockUser);

    const result = await userService.deleteUser(1, 1);

    expect(result).toBeDefined();
    expect(mockUserRepo.delete).toHaveBeenCalledWith(1);
  });
});