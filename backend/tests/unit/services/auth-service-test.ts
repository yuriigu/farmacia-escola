import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../../../src/services/auth-service';
import { UserRepository } from '../../../src/repositories/user-repository';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockUser } from '../../fixtures/users-fixture';

// mockamos os dois repositorios e o prisma pra isolar o auth-service.
// aqui a gente testa a regra de negocio de autenticacao: login (com
// senha correta, senha errada, usuario inexistente e usuario inativo),
// cadastro publico de paciente e leitura do proprio perfil.
// o bcrypt roda de verdade porque a regra depende dele (nao faz sentido
// mockar hash aqui).
vi.mock('../../../src/repositories/user-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

// testes do auth-service.
// agrupados por metodo: login, registerpatient e getprofile.
describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mocks dos dois repositorios que o service usa.
    mockUserRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByRegistration: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    mockPatientRepo = {
      findByUserId: vi.fn(),
      findByCpf: vi.fn(),
      create: vi.fn(),
    };

    // quando o service instancia cada repositorio no construtor,
    // essas implementacoes entregam os mocks no lugar.
    (UserRepository as any).mockImplementation(function () {
      return mockUserRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    authService = new AuthService();
  });

  describe('login', () => {
    // caminho feliz: usuario existe, esta ativo e a senha bate.
    // o hash e gerado com bcrypt de verdade pra o compare funcionar.
    it('deve autenticar usuário com credenciais corretas e retornar token', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        active: true,
        password: hashedPassword,
        patient: { id: 1 },
      });

      const result = await authService.login(mockUser.email, 'senha123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
    });

    // usuario nao existe: o service ainda roda um bcrypt.compare
    // contra um hash fake pra gastar o mesmo tempo e nao vazar por
    // timing se o email esta ou nao cadastrado. o resultado final
    // e 401 com mensagem generica.
    it('deve lançar erro se usuário não for encontrado', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('inexistente@farmacia.ufba.br', 'senha123')
      ).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
    });

    // senha errada: compare falha e o service lanca 401.
    it('deve lançar erro se a senha estiver incorreta', async () => {
      const hashedPassword = await bcrypt.hash('senhaCorreta', 10);
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        active: true,
        password: hashedPassword,
      });

      await expect(
        authService.login(mockUser.email, 'senhaErrada')
      ).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
    });

    // usuario inativo tambem cai como 401 generico, sem revelar
    // que a conta existe.
    it('deve lançar erro se o usuário estiver inativo', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await expect(
        authService.login(mockUser.email, 'qualquerSenha')
      ).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('registerPatient', () => {
    // cadastro feliz: email e cpf livres, transacao devolve o usuario
    // criado, e o service retorna token + user.
    it('deve registrar novo paciente com sucesso', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockPatientRepo.findByCpf.mockResolvedValue(null);
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return {
          id: 10,
          name: 'Maria Silva',
          email: 'maria@teste.com',
          role: 'PACIENTE',
          patient: { id: 5 },
        };
      });

      const result = await authService.registerPatient({
        name: 'Maria Silva',
        email: 'maria@teste.com',
        password: 'Password123',
        cpf: '12345678901',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });

    // email ja em uso: o service lanca 409 com mensagem generica
    // (mesma que devolveria se fosse cpf em uso, por anti-enumeracao).
    it('deve lançar erro se e-mail já estiver cadastrado', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.registerPatient({
          name: 'Duplicado',
          email: mockUser.email,
          password: 'Password123',
          cpf: '12345678901',
        })
      ).rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
    });
  });

  describe('getProfile', () => {
    // busca o usuario logado pelo id e devolve o perfil sanitizado
    // (o service tira a senha e resolve o patientid).
    it('deve retornar perfil do usuário autenticado', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        patient: { id: 1 },
      });

      const profile = await authService.getProfile(mockUser.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe(mockUser.email);
    });

    // paciente legado sem registerDoc (criado antes do campo ser
    // preenchido): o withRegisterDoc espelha o cpf do cadastro de
    // paciente vinculado, pra tela de settings exibir o documento
    // real em vez de um id interno.
    it('deve espelhar o CPF do paciente no registerDoc quando estiver nulo', async () => {
      mockUserRepo.findById.mockResolvedValue({
        id: 10,
        name: 'João Silva',
        email: 'joao@email.com',
        role: 'PACIENTE',
        registerDoc: null,
        patient: { id: 5, cpf: '12345678900' },
      });

      const profile = await authService.getProfile(10);

      expect(profile.registerDoc).toBe('12345678900');
      expect(profile.patientId).toBe(5);
      // nunca devolve a senha no payload de sessao.
      expect((profile as any).password).toBeUndefined();
    });

    // usuario com documento ja cadastrado (crf/crm/ra/etc): o valor
    // original e preservado, sem sobrescrita.
    it('deve preservar o registerDoc já cadastrado', async () => {
      mockUserRepo.findById.mockResolvedValue({
        id: 2,
        name: 'Farmacêutico Teste',
        email: 'farmaceutico@farmacia.ufba.br',
        role: 'FARMACEUTICO',
        registerDoc: 'CRF-SP 12345',
        patient: null,
      });

      const profile = await authService.getProfile(2);

      expect(profile.registerDoc).toBe('CRF-SP 12345');
      expect(profile.patientId).toBeNull();
    });
  });

  describe('login - documento de identificacao', () => {
    // paciente sem registerDoc gravado: o login tambem passa pelo
    // withRegisterDoc e devolve o cpf do cadastro junto do token,
    // garantindo que a sessao ja nasca com o documento certo.
    it('deve devolver registerDoc espelhado do CPF no login de paciente legado', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);
      mockUserRepo.findByEmail.mockResolvedValue({
        id: 10,
        name: 'João Silva',
        email: 'joao@email.com',
        role: 'PACIENTE',
        registerDoc: null,
        active: true,
        password: hashedPassword,
        patient: { id: 5, cpf: '12345678900' },
      });

      const result = await authService.login('joao@email.com', 'senha123');

      expect(result).toHaveProperty('token');
      expect(result.user.registerDoc).toBe('12345678900');
      expect(result.user.patientId).toBe(5);
    });
  });
});