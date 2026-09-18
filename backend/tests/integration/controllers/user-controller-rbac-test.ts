import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from '../../../src/controllers/user-controller';
import { UserService } from '../../../src/services/user-service';

vi.mock('../../../src/services/user-service');

function buildResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe('UserController create RBAC', () => {
  let userController: UserController;
  let mockUserService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserService = {
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn().mockResolvedValue({ id: 10, role: 'PACIENTE' }),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    (UserService as any).mockImplementation(function () {
      return mockUserService;
    });

    userController = new UserController();
  });

  it('deve permitir que ADMIN cadastre qualquer perfil', async () => {
    const req: any = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: { name: 'Novo Medico', email: 'medico@teste.com', password: '123456', role: 'MEDICO' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve permitir que FARMACEUTICO cadastre PACIENTE', async () => {
    const req: any = {
      user: { userId: 2, role: 'FARMACEUTICO' },
      params: {},
      body: { name: 'Paciente Novo', email: 'paciente@teste.com', password: '123456', role: 'PACIENTE' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    expect(mockUserService.createUser).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ role: 'PACIENTE' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve bloquear FARMACEUTICO ao tentar cadastrar ADMIN', async () => {
    const req: any = {
      user: { userId: 2, role: 'FARMACEUTICO' },
      params: {},
      body: { name: 'Falso Admin', email: 'falso@teste.com', password: '123456', role: 'ADMIN' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    expect(mockUserService.createUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve bloquear MEDICO e ALUNO ao cadastrarem perfis diferentes de PACIENTE', async () => {
    for (const actor of ['MEDICO', 'ALUNO']) {
      vi.clearAllMocks();

      const req: any = {
        user: { userId: 3, role: actor },
        params: {},
        body: { name: 'Equipe', email: 'equipe@teste.com', password: '123456', role: 'FARMACEUTICO' },
      };
      const res = buildResponse();

      await userController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    }
  });

  it('deve bloquear PACIENTE de cadastrar usuarios', async () => {
    const req: any = {
      user: { userId: 4, role: 'PACIENTE' },
      params: {},
      body: { name: 'Paciente', email: 'paciente2@teste.com', password: '123456', role: 'PACIENTE' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserService.createUser).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando nao autenticado', async () => {
    const req: any = { user: null, params: {}, body: {} };
    const res = buildResponse();

    await userController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockUserService.createUser).not.toHaveBeenCalled();
  });
});
