import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository';
import { PatientRepository } from '../repositories/patient-repository';
import { generateToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { Role } from '../types/enums';

// service de autenticacao. concentra as regras de login, cadastro
// publico de paciente, leitura do proprio perfil e atualizacao de dados.
// aqui ficam as checagens de senha (bcrypt), a geracao do token jwt
// e a criacao do usuario junto com o cadastro de paciente.
export class AuthService {
  private userRepo: UserRepository;
  private patientRepo: PatientRepository;

  constructor() {
    // instanciamos os repositorios que o service vai usar pra
    // consultar usuario e paciente.
    this.userRepo = new UserRepository();
    this.patientRepo = new PatientRepository();
  }

  // checagem simples de cpf: so conta os digitos e exige 11.
  // nao valida digito verificador, so o formato minimo.
  private isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11;
  }

  // faz o login do usuario. valida entrada, busca por email,
  // confere a senha com bcrypt e devolve o token junto com os
  // dados basicos do usuario (sem a senha).
  // detalhe importante: quando email ou usuario nao existem,
  // ainda rodamos um bcrypt.compare contra um hash fake pra gastar
  // o mesmo tempo de resposta e nao entregar por timing se o email
  // esta ou nao cadastrado.
  async login(email: string, password: string) {
    if (!email) {
      throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
    } else {
      if (!password) {
        throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
      }
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // bcrypt.compare contra hash fake so pra igualar o tempo de resposta.
      await bcrypt.compare(password, '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m');
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    } else {
      // usuario desativado tambem passa por bcrypt fake (ou real, se
      // tiver hash) pra nao vazar o estado da conta por timing.
      if (!user.active) {
        let userHash = '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m';
        if (user.password) {
          userHash = user.password;
        } else {
          userHash = '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m';
        }
        await bcrypt.compare(password, userHash);
        throw { statusCode: 401, message: 'Credenciais inválidas' };
      }
    }

    // checagem real da senha. se nao bater, 401 generico.
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }

    // se o usuario for paciente, guardamos o id do cadastro dele
    // pra incluir no token e o front saber pra onde ir.
    let userPatientId = null;
    if (user.patient) {
      userPatientId = user.patient.id;
    } else {
      userPatientId = null;
    }

    // aqui chamamos o generateToken (/utils/jwt.ts) pra assinar
    // o token com userId, role, email e patientId.
    const token = generateToken({
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: userPatientId,
    });

    // tira a senha do objeto antes de devolver.
    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: {
        ...userWithoutPassword,
        patientId: userPatientId,
      },
    };
  }

  // cadastro publico de paciente. cria usuario (role paciente) e o
  // cadastro de paciente vinculado numa transacao, e ja devolve o token
  // pra deixar o paciente logado automaticamente.
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

    // campos obrigatorios.
    if (!name) {
      throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
    } else {
      if (!email) {
        throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
      } else {
        if (!password) {
          throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
        } else {
          if (!cpf) {
            throw { statusCode: 400, message: 'Nome, email, senha e CPF são obrigatórios' };
          }
        }
      }
    }

    if (!this.isValidCPF(cpf)) {
      throw { statusCode: 400, message: 'CPF inválido' };
    }

    // checa conflito de email e cpf em paralelo conceitual: se qualquer
    // um dos dois ja existir, bloqueia o cadastro.
    const existingUser = await this.userRepo.findByEmail(email);
    let hasConflict = false;
    if (existingUser) {
      hasConflict = true;
    } else {
      hasConflict = false;
    }

    const existingPatient = await this.patientRepo.findByCpf(cpf);
    if (existingPatient) {
      hasConflict = true;
    }

    if (hasConflict) {
      throw { statusCode: 409, message: 'Dados cadastrais já em uso ou inválidos' };
    }

    // hash bcrypt com custo 12 (mais forte que o 10 usado em outros pontos,
    // porque aqui e o cadastro publico).
    const hashedPassword = await bcrypt.hash(password, 12);

    // cria usuario e paciente numa transacao pra nao ficar usuario
    // sem paciente associado caso algo falhe no meio.
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: Role.PACIENTE,
          phone,
        },
        include: { patient: true },
      });

      // normaliza birthDate pra Date ou null.
      let birthDateObj = null;
      if (birthDate) {
        birthDateObj = new Date(birthDate);
      } else {
        birthDateObj = null;
      }

      const patient = await tx.patient.create({
        data: {
          name,
          cpf,
          phone,
          birthDate: birthDateObj,
          address,
          userId: newUser.id,
        },
      });

      return { ...newUser, patient };
    });

    let newPatientId = null;
    if (user.patient) {
      newPatientId = user.patient.id;
    } else {
      newPatientId = null;
    }

    // gera o token ja na hora do cadastro, pra logar o paciente direto.
    const token = generateToken({
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: newPatientId,
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: {
        ...userWithoutPassword,
        patientId: newPatientId,
      },
    };
  }

  // devolve o perfil do usuario logado (sem senha), com patientId
  // embutido quando existir.
  async getProfile(userId: number) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    let userPatientId = null;
    if (user.patient) {
      userPatientId = user.patient.id;
    } else {
      userPatientId = null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      patientId: userPatientId,
    };
  }

  // atualiza os dados do proprio perfil. se veio troca de senha,
  // exige a senha atual e valida com bcrypt antes de hashear a nova.
  async updateProfile(userId: number, data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string; address?: string }) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // monta o update so com os campos que vieram.
    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }

    // se veio nova senha, valida a atual antes.
    if (data.newPassword) {
      if (!data.currentPassword) {
        throw { statusCode: 400, message: 'Senha atual é obrigatória para alterar a senha' };
      }
      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid) {
        throw { statusCode: 400, message: 'Senha atual incorreta' };
      }
      updateData.password = await bcrypt.hash(data.newPassword, 12);
    }

    // chama o repositorio (/repositories/user-repository.ts) pra persistir.
    // ele tambem sincroniza o cadastro de paciente quando os campos batem.
    const updated = await this.userRepo.update(userId, updateData);
    const { password: _, ...userWithoutPassword } = updated as any;

    let userPatientId = null;
    if (user.patient) {
      userPatientId = user.patient.id;
    } else {
      userPatientId = null;
    }

    return {
      message: 'Perfil atualizado com sucesso',
      user: {
        ...userWithoutPassword,
        patientId: userPatientId,
      },
    };
  }
}