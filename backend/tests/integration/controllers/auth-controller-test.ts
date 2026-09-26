import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../../src/controllers/auth-controller';
import { AuthService } from '../../../src/services/auth-service';

// mockamos o auth-service pra isolar o controller. os testes aqui
// querem validar so o comportamento http: o que o controller repassa
// pro service e como ele monta a resposta (status, json). a regra de
// negocio (hash, jwt, criacao de paciente) nao entra nesse teste.
vi.mock('../../../src/services/auth-service');

// testes de integracao do auth-controller.
// cobrem o caminho feliz do login, o caminho de erro e o /me.
describe('AuthController Integration', () => {
  let authController: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os quatro metodos que o controller usa.
    // cada um e vi.fn() pra controlar o retorno e poder afirmar
    // o que foi chamado.
    mockAuthService = {
      login: vi.fn(),
      registerPatient: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
    };
    // quando o controller instancia o authservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (AuthService as any).mockImplementation(function () {
      return mockAuthService;
    });
    authController = new AuthController();
  });

  // caminho feliz do login: service devolve token, controller
  // responde com o json contendo token e usuario.
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

    // confirma que o controller passou email e senha pro service,
    // e que a resposta foi o token + usuario.
    expect(mockAuthService.login).toHaveBeenCalledWith('admin@farmacia.ufba.br', 'senha');
    expect(mockRes.json).toHaveBeenCalledWith({ token: 'jwt-token-123', user: { id: 1 } });
  });

  // caminho de erro do login: service lanca um erro com statuscode,
  // e o controller deve converter em resposta 401 com a mensagem.
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

    // confirma que virou 401 com a mensagem do erro.
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
  });

  // endpoint /me: precisa do usuario autenticado no req e devolve
  // o perfil que o service retornar, sem transformacao.
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

    // confirma que o controller chamou o service com o userid
    // do token e devolveu o perfil.
    expect(mockAuthService.getProfile).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, name: 'Admin' });
  });
});