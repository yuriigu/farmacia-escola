import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../../src/services/user-service';
import { UserRepository } from '../../../src/repositories/user-repository';
import { mockUser, mockUsersList as baseMockUsersList } from '../../fixtures/users-fixture';

// a gente deriva a lista de usuarios das fixtures e zera address e
// birthdate. isso porque o service sanitiza a resposta (formata
// birthdate como string so com a data, e resolve address do usuario
// ou do paciente). entao o teste precisa do "shape" esperado apos a
// sanitizacao, nao do fixture original.
const mockUsersList = baseMockUsersList.map((user) => ({
  ...user,
  address: null,
  birthDate: null,
}));

// mockamos o repositorio de usuario e o activity-log-service pra
// isolar o user-service. os testes cobrem listagem, busca por id,
// update e delete, alem do caminho de erro quando o usuario nao
// existe.
vi.mock('../../../src/repositories/user-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do user-service.
// o foco aqui e a delegacao pro repositorio e as validacoes do
// service (existencia antes de editar/excluir, travas de admin).
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de usuario com os metodos usados pelo service.
    mockUserRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // quando o service instancia o repositorio no construtor,
    // essa implementacao entrega o mock no lugar.
    (UserRepository as any).mockImplementation(function () {
      return mockUserRepo;
    });

    userService = new UserService();
  });

  // verifica que o getallusers delega pro findall do repo e devolve
  // a lista ja sanitizada (sem senha, com birthdate e address
  // resolvidos). por isso a lista de entrada ja vem com esses campos
  // zerados.
  it('deve listar todos os usuários', async () => {
    mockUserRepo.findAll.mockResolvedValue(mockUsersList);

    const users = await userService.getAllUsers();

    expect(users).toEqual(mockUsersList);
    expect(mockUserRepo.findAll).toHaveBeenCalledTimes(1);
  });

  // verifica que o getuserbyid chama o findbyid com o id certo e
  // devolve o usuario sanitizado.
  it('deve buscar usuário por ID', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);

    const user = await userService.getUserById(1);

    expect(user.id).toBe(mockUser.id);
    expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
  });

  // quando o repo devolve null, o service precisa lancar 404 pro
  // controller converter em resposta http.
  it('deve lançar erro ao buscar usuário inexistente', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(userService.getUserById(999)).rejects.toEqual(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  // caminho feliz do update: precisa que o usuario exista antes
  // (findbyid), e o retorno deve refletir as mudancas ja sanitizadas.
  it('deve atualizar dados do usuário com sucesso', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue({ ...mockUser, name: 'Nome Atualizado' });

    const updated = await userService.updateUser(1, 1, { name: 'Nome Atualizado' });

    expect(updated.name).toBe('Nome Atualizado');
    expect(mockUserRepo.update).toHaveBeenCalled();
  });

  // caminho feliz do delete: o service checa existencia antes e
  // delega o delete pro repo. o adminid (2) e diferente do id alvo
  // (1), entao a trava de auto-exclusao nao dispara.
  it('deve deletar usuário existente', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.delete.mockResolvedValue(mockUser);

    const result = await userService.deleteUser(2, 1);

    expect(result).toBeDefined();
    expect(mockUserRepo.delete).toHaveBeenCalledWith(1);
  });
});