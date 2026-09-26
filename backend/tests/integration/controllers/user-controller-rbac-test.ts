import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from '../../../src/controllers/user-controller';
import { UserService } from '../../../src/services/user-service';

// mockamos o user-service pra isolar o controller.
// esse arquivo testa exclusivamente a regra de rbac do endpoint
// de criacao de usuario: quem pode criar qual perfil. a regra de
// negocio (hash, unicidade de email, etc) fica de fora.
vi.mock('../../../src/services/user-service');

// helper que constroi um response fake com status, json e send
// encadeaveis, pra qualquer teste poder montar seu res rapidamente
// sem repetir codigo.
function buildResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

// testes de rbac (role based access control) do user-controller
// no fluxo de criacao. cobrem todos os papeis relevantes e o caso
// nao autenticado.
describe('UserController create RBAC', () => {
  let userController: UserController;
  let mockUserService: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes.
    vi.clearAllMocks();

    // mock do service. o createuser ja vem resolvendo com um objeto
    // fake, porque na maioria dos casos o teste so quer checar se
    // foi chamado e com qual status respondeu.
    mockUserService = {
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn().mockResolvedValue({ id: 10, role: 'PACIENTE' }),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    // quando o controller instancia o userservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (UserService as any).mockImplementation(function () {
      return mockUserService;
    });

    userController = new UserController();
  });

  // admin pode criar qualquer perfil. aqui ele cria um medico,
  // que e o caso mais permissivo do rbac.
  it('deve permitir que ADMIN cadastre qualquer perfil', async () => {
    const req: any = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: { name: 'Novo Medico', email: 'medico@teste.com', password: '123456', role: 'MEDICO' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    // confirma que o service foi chamado uma vez e o controller
    // respondeu 201.
    expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // farmaceutico pode criar paciente. o teste confirma tambem que
  // o payload que chega no service mantem role paciente.
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

  // farmaceutico nao pode criar admin. essa e a trava principal
  // contra escalada de privilegio.
  it('deve bloquear FARMACEUTICO ao tentar cadastrar ADMIN', async () => {
    const req: any = {
      user: { userId: 2, role: 'FARMACEUTICO' },
      params: {},
      body: { name: 'Falso Admin', email: 'falso@teste.com', password: '123456', role: 'ADMIN' },
    };
    const res = buildResponse();

    await userController.create(req, res);

    // service nao pode ser chamado, e a resposta deve ser 403.
    expect(mockUserService.createUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // medico e aluno so podem criar paciente. o teste roda os dois
  // papeis num loop pra economizar codigo, cada um tentando criar
  // um farmaceutico (que nao e permitido).
  it('deve bloquear MEDICO e ALUNO ao cadastrarem perfis diferentes de PACIENTE', async () => {
    for (const actor of ['MEDICO', 'ALUNO']) {
      // limpa contadores a cada iteracao pra nao misturar os casos.
      vi.clearAllMocks();

      const req: any = {
        user: { userId: 3, role: actor },
        params: {},
        body: { name: 'Equipe', email: 'equipe@teste.com', password: '123456', role: 'FARMACEUTICO' },
      };
      const res = buildResponse();

      await userController.create(req, res);

      // cada iteracao precisa responder 403 e nao chamar o service.
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    }
  });

  // paciente nao pode criar usuario nenhum. e o caso mais restrito.
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

  // sem usuario no request, o controller precisa responder 401
  // antes de qualquer checagem de papel.
  it('deve retornar 401 quando nao autenticado', async () => {
    const req: any = { user: null, params: {}, body: {} };
    const res = buildResponse();

    await userController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockUserService.createUser).not.toHaveBeenCalled();
  });
});