import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { generateToken } from '../utils/Jwt';
import { prisma } from '../utils/Prisma';
import { Role } from '../types/Enums';

export class AuthService {
  private userRepo: UserRepository;
  private patientRepo: PatientRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.patientRepo = new PatientRepository();
  }

  private isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11 || /^(.)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i)) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i)) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(digits.charAt(10));
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.active) {
      throw { statusCode: 401, message: 'Credenciais inválidas ou usuário inativo' };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }

    const token = generateToken({
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: user.patient?.id ?? null,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: {
        ...userWithoutPassword,
        patientId: user.patient?.id ?? null,
      },
    };
  }

  async registerPatient(data: {
    name: string;
    email: string;
    password: string;
    cpf: string;
    phone?: string;
    birthDate?: string;
    address?: string;
  }) {
    const { name, email, password, cpf, phone, birthDate, address } = data;

    if (!name || !email || !password || !cpf) {
      throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
    }

    if (!this.isValidCPF(cpf)) {
      throw { statusCode: 400, message: 'CPF inválido' };
    }

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw { statusCode: 409, message: 'Email já cadastrado' };
    }

    const existingPatient = await this.patientRepo.findByCpf(cpf);
    if (existingPatient) {
      throw { statusCode: 409, message: 'CPF já cadastrado' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'PACIENTE',
          phone,
        },
        include: { patient: true },
      });

      const patient = await tx.patient.create({
        data: {
          name,
          cpf,
          phone,
          birthDate: birthDate ? new Date(birthDate) : null,
          address,
          userId: newUser.id,
        },
      });

      return { ...newUser, patient };
    });

    const token = generateToken({
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: user.patient?.id ?? null,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: {
        ...userWithoutPassword,
        patientId: user.patient?.id ?? null,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      patientId: user.patient?.id ?? null,
    };
  }

  async updateProfile(userId: number, data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string }) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw { statusCode: 400, message: 'Senha atual é obrigatória para alterar a senha' };
      }
      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid) {
        throw { statusCode: 400, message: 'Senha atual incorreta' };
      }
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    const updated = await this.userRepo.update(userId, updateData);
    const { password: _, ...userWithoutPassword } = updated as any;
    return {
      message: 'Perfil atualizado com sucesso',
      user: {
        ...userWithoutPassword,
        patientId: user.patient?.id ?? null,
      },
    };
  }
}