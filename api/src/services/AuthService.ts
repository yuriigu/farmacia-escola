import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { generateToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';  // 👈 Importe o enum

export class AuthService {
  private userRepo: UserRepository;
  private patientRepo: PatientRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.patientRepo = new PatientRepository();
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
      role: user.role,
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

    const digitsOnly = (v: string) => v.replace(/\D/g, '');
    const cpfDigits = digitsOnly(cpf);
    if (cpfDigits.length !== 11 || /^(.)\1{10}$/.test(cpfDigits)) {
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
          role: Role.PACIENTE,  // 👈 Use o enum Role
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
      role: user.role,
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
}