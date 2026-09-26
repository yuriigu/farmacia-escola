import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from '../../../src/controllers/user-controller';
import { UserService } from '../../../src/services/user-service';
import { mockUser, mockUsersList } from '../../fixtures/users-fixture';

// mockamos o user-service pra isolar o controller.
// esses testes cobrem o caminho feliz da gestao de usuario
// (listar, buscar por id, criar). a rbac fina do create tem
// arquivo proprio (user-controller-create-rbac), entao aqui o foco
// e so o fluxo http comum.
vi.mock('../../../src/services/user-service');

// testes de integracao do user-controller no caminho feliz.
// usa um mockreq e um mockres reutilizados, ajustados em cada caso.
describe('UserController Integration', () => {
  let userController: UserController;
  let mockUserService: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa.
    mockUserService = {
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    // quando o controller instancia o userservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (UserService as any).mockImplementation(function () {
      return mockUserService;
    });

    userController = new UserController();

    // req fake padrao com usuario admin. cada teste ajusta o que precisa.
    mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: {},
      query: {},
    };

    // res fake com status, json e send encadeaveis.
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  // verifica que o getall delega pro service e devolve a lista
  // como veio, sem transformacao no controller.
  it('deve retornar lista de usuários', async () => {
    mockUserService.getAllUsers.mockResolvedValue(mockUsersList);

    await userController.getAll(mockReq, mockRes);

    expect(mockUserService.getAllUsers).toHaveBeenCalledTimes(1);
    expect(mockRes.json).toHaveBeenCalledWith(mockUsersList);
  });

  // verifica que o getbyid converte o id de string pra numero antes
  // de repassar pro service.
  it('deve buscar usuário por ID', async () => {
    mockReq.params.id = '1';
    mockUserService.getUserById.mockResolvedValue(mockUser);

    await userController.getById(mockReq, mockRes);

    expect(mockUserService.getUserById).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
  });

  // verifica o fluxo de criacao no caminho feliz (admin criando
  // farmaceutico): o controller deve repassar o adminid e o payload,
  // e responder 201 com o usuario criado.
  it('deve criar usuário com dados válidos', async () => {
    const newUser = { name: 'Novo', email: 'novo@teste.com', role: 'FARMACEUTICO', password: '123' };
    mockReq.body = newUser;
    mockUserService.createUser.mockResolvedValue({ id: 2, ...newUser });

    await userController.create(mockReq, mockRes);

    expect(mockUserService.createUser).toHaveBeenCalledWith(1, newUser);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});