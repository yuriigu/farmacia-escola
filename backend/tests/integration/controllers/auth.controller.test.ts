import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../../src/controllers/AuthController';
import { AuthService } from '../../../src/services/AuthService';

vi.mock('../../../src/services/AuthService');

describe('AuthController Integration', () => {
  let authController: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService = {
      login: vi.fn(),
      registerPatient: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    };
    (AuthService as any).mockImplementation(function () {
      return mockAuthService;
    });
    authController = new AuthController();
  });

  it('deve processar requisição de login e retornar status 200 com token', async () => {
    const mockReq = {
      body: { email: 'admin@farmacia.ufba.br', password: 'senha' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAuthService.login.mockResolvedValue({ token: 'jwt-token-123', user: { id: 1 } });

    await authController.login(mockReq, mockRes);

    expect(mockAuthService.login).toHaveBeenCalledWith('admin@farmacia.ufba.br', 'senha');
    expect(mockRes.json).toHaveBeenCalledWith({ token: 'jwt-token-123', user: { id: 1 } });
  });

  it('deve retornar status 401 ou erro capturado no login', async () => {
    const mockReq = {
      body: { email: 'admin@farmacia.ufba.br', password: 'errada' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAuthService.login.mockRejectedValue({ statusCode: 401, message: 'Credenciais inválidas' });

    await authController.login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
  });

  it('deve retornar perfil no endpoint /me para usuário autenticado', async () => {
    const mockReq = {
      user: { userId: 1, role: 'ADMIN' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAuthService.getProfile.mockResolvedValue({ id: 1, name: 'Admin' });

    await authController.me(mockReq, mockRes);

    expect(mockAuthService.getProfile).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, name: 'Admin' });
  });
});
