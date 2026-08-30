import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from '../../../src/controllers/UserController';
import { UserService } from '../../../src/services/UserService';
import { mockUser, mockUsersList } from '../../fixtures/Users.fixture';

vi.mock('../../../src/services/UserService');

describe('UserController Integration', () => {
  let userController: UserController;
  let mockUserService: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserService = {
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    (UserService as any).mockImplementation(function () {
      return mockUserService;
    });

    userController = new UserController();

    mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  it('deve retornar lista de usuários', async () => {
    mockUserService.getAllUsers.mockResolvedValue(mockUsersList);

    await userController.getAll(mockReq, mockRes);

    expect(mockUserService.getAllUsers).toHaveBeenCalledTimes(1);
    expect(mockRes.json).toHaveBeenCalledWith(mockUsersList);
  });

  it('deve buscar usuário por ID', async () => {
    mockReq.params.id = '1';
    mockUserService.getUserById.mockResolvedValue(mockUser);

    await userController.getById(mockReq, mockRes);

    expect(mockUserService.getUserById).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
  });

  it('deve criar usuário com dados válidos', async () => {
    const newUser = { name: 'Novo', email: 'novo@teste.com', role: 'FARMACEUTICO', password: '123' };
    mockReq.body = newUser;
    mockUserService.createUser.mockResolvedValue({ id: 2, ...newUser });

    await userController.create(mockReq, mockRes);

    expect(mockUserService.createUser).toHaveBeenCalledWith(1, newUser);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});