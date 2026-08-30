import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../../../src/services/AuthService';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { prisma } from '../../../src/utils/Prisma';
import { mockUser } from '../../fixtures/Users.fixture';

vi.mock('../../../src/repositories/UserRepository');
vi.mock('../../../src/repositories/PatientRepository');
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
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

    (UserRepository as any).mockImplementation(function () {
      return mockUserRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    authService = new AuthService();
  });

  describe('login', () => {
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

    it('deve lançar erro se usuário não for encontrado', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('inexistente@farmacia.ufba.br', 'senha123')
      ).rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
    });

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
    it('deve retornar perfil do usuário autenticado', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        patient: { id: 1 },
      });

      const profile = await authService.getProfile(mockUser.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe(mockUser.email);
    });
  });
});