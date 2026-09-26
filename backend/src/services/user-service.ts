import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository';
import { ActivityLogService } from './activity-log-service';
import { Role } from '../types/enums';
import { prisma } from '../utils/prisma';

// service de usuario. concentra as regras de negocio da gestao de contas:
// listar, buscar, criar, atualizar, ativar/desativar e excluir usuarios.
// tambem cuida de coisas sensiveis: validacao de email e senha, hash de
// senha, sanitizacao da resposta (tira senha e normaliza campos do paciente)
// e as travas pra nao deixar o sistema sem admin ativo.
export class UserService {
  private userRepo: UserRepository;
  private logService: ActivityLogService;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor() {
    // repositorio de usuario e service de log de auditoria.
    this.userRepo = new UserRepository();
    this.logService = new ActivityLogService();
  }

  // limpa o objeto do usuario antes de devolver pra fora.
  // tira a senha, resolve birthdate e address considerando que eles
  // podem vir do proprio usuario ou do paciente vinculado, e formata
  // a data como string so com a parte do dia (yyyy-mm-dd).
  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;

    // birthdate pode estar no usuario (quando o repo devolve) ou
    // no paciente (quando o cadastro de paciente carrega o dado).
    let rawBirthDate = null;
    if (user.birthDate) {
      rawBirthDate = user.birthDate;
    } else {
      if (user.patient) {
        if (user.patient.birthDate) {
          rawBirthDate = user.patient.birthDate;
        } else {
          rawBirthDate = null;
        }
      } else {
        rawBirthDate = null;
      }
    }

    // mesma ideia pro endereco.
    let address = null;
    if (user.address) {
      address = user.address;
    } else {
      if (user.patient) {
        if (user.patient.address) {
          address = user.patient.address;
        } else {
          address = null;
        }
      } else {
        address = null;
      }
    }

    // formata birthdate como yyyy-mm-dd. aceita string (com t) ou date.
    let birthDateStr: string | null = null;
    if (rawBirthDate) {
      if (typeof rawBirthDate === 'string') {
        birthDateStr = rawBirthDate.split('T')[0];
      } else if (rawBirthDate instanceof Date && !isNaN(rawBirthDate.getTime())) {
        birthDateStr = rawBirthDate.toISOString().split('T')[0];
      }
    }

    return {
      ...userWithoutPassword,
      birthDate: birthDateStr,
      address: address,
    };
  }

  // valida o formato do email com regex simples.
  private validateEmail(email: string) {
    if (!this.emailRegex.test(email)) {
      throw { statusCode: 400, message: 'Formato de email inválido' };
    }
  }

  // valida tamanho minimo da senha. a regra e 6 caracteres.
  private validatePassword(password: string) {
    if (password.length < 6) {
      throw { statusCode: 400, message: 'A senha deve ter pelo menos 6 caracteres' };
    }
  }

  // lista todos os usuarios ja sanitizados (sem senha).
  async getAllUsers() {
    const users = await this.userRepo.findAll();
    return users.map((user) => this.sanitizeUser(user));
  }

  // busca um usuario pelo id, sanitizado. se nao achar, lanca 404.
  async getUserById(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }
    return this.sanitizeUser(user);
  }

  // cria um novo usuario. valida nome, email, senha e perfil, checa
  // duplicidade de email, normaliza os campos e aplica hash na senha.
  // permissions so e guardado pra aluno (regra de negocio do sistema),
  // pros demais perfis o campo e limpo. registra auditoria no fim.
  async createUser(adminId: number, data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    registerDoc?: string | null;
    phone?: string | null;
    birthDate?: string | Date | null;
    address?: string | null;
    permissions?: any;
  }) {
    // normaliza nome e email (trim, lowercase no email).
    let cleanName = '';
    if (data.name) {
      cleanName = data.name.trim();
    } else {
      cleanName = '';
    }

    let cleanEmail = '';
    if (data.email) {
      cleanEmail = data.email.trim().toLowerCase();
    } else {
      cleanEmail = '';
    }

    // nome, email, senha e perfil sao obrigatorios.
    if (!cleanName) {
      throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
    } else {
      if (!cleanEmail) {
        throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
      } else {
        if (!data.password) {
          throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
        } else {
          if (!data.role) {
            throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
          }
        }
      }
    }

    // validacoes de formato antes de qualquer ida ao banco.
    this.validateEmail(cleanEmail);
    this.validatePassword(data.password);

    // checa se o email ja esta em uso.
    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      throw { statusCode: 409, message: 'Email já cadastrado' };
    }

    // normaliza os campos opcionais (trim ou null).
    let phoneVal = null;
    if (data.phone) {
      phoneVal = data.phone.trim();
    } else {
      phoneVal = null;
    }

    let registerDocVal = null;
    if (data.registerDoc) {
      registerDocVal = data.registerDoc.trim();
    } else {
      registerDocVal = null;
    }

    let addressVal = null;
    if (data.address) {
      addressVal = data.address.trim();
    } else {
      addressVal = null;
    }

    let birthDateVal = null;
    if (data.birthDate) {
      birthDateVal = data.birthDate;
    } else {
      birthDateVal = null;
    }

    // permissions so faz sentido pra aluno. pra outros perfis, limpa.
    let permissionsVal = undefined;
    if (data.role === Role.ALUNO) {
      permissionsVal = data.permissions;
    } else {
      permissionsVal = undefined;
    }

    // hash da senha com custo 12.
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // chama o repositorio (/repositories/user-repository.ts) pra criar.
    // ele tambem cuida de criar o paciente vinculado quando faz sentido.
    const user = await this.userRepo.create({
      ...data,
      name: cleanName,
      email: cleanEmail,
      phone: phoneVal,
      registerDoc: registerDocVal,
      address: addressVal,
      birthDate: birthDateVal,
      password: hashedPassword,
      permissions: permissionsVal,
    });

    await this.logService.log(
      adminId,
      'create',
      'users',
      user.id,
      `Criou usuário ${user.name} (${user.role})`
    );

    return this.sanitizeUser(user);
  }

  // atualiza um usuario. tem algumas travas importantes:
  // - auto-edicao nao pode alterar o registerdoc
  // - rebaixar ou desativar o ultimo admin ativo e bloqueado
  // - senha em branco nao sobrescreve a atual
  // apos o update, sanitiza e registra auditoria.
  async updateUser(adminId: number, id: number, data: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
    registerDoc?: string | null;
    phone?: string | null;
    birthDate?: string | Date | null;
    address?: string | null;
    active?: boolean;
    permissions?: any;
  }) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // trava 1: se o admin esta editando a si mesmo, nao pode trocar
    // o registerdoc (documento profissional que o identifica).
    if (adminId === id) {
      if (data.registerDoc !== undefined) {
        let currentDoc = '';
        if (user.registerDoc) {
          currentDoc = user.registerDoc.trim();
        } else {
          currentDoc = '';
        }

        let requestedDoc = '';
        if (data.registerDoc) {
          requestedDoc = data.registerDoc.trim();
        } else {
          requestedDoc = '';
        }

        if (currentDoc !== requestedDoc) {
          throw { statusCode: 400, message: 'O identificador não pode ser alterado na auto-edição de perfil' };
        }
      }
    }

    // trava 2: se o usuario alvo e admin ativo, nao permite rebaixar
    // nem desativar se for o unico admin ativo. evita o sistema ficar
    // sem administrador.
    if (user.role === Role.ADMIN) {
      if (user.active) {
        let isDemotingRole = false;
        if (data.role !== undefined) {
          if (data.role !== Role.ADMIN) {
            isDemotingRole = true;
          }
        }

        let isDeactivating = false;
        if (data.active !== undefined) {
          if (Boolean(data.active) === false) {
            isDeactivating = true;
          }
        }

        if (isDemotingRole) {
          const activeAdminsCount = await prisma.user.count({
            where: {
              role: Role.ADMIN,
              active: true,
            },
          });
          if (activeAdminsCount <= 1) {
            throw { statusCode: 400, message: 'Não é possível rebaixar a role do único administrador ativo do sistema' };
          }
        } else {
          if (isDeactivating) {
            const activeAdminsCount = await prisma.user.count({
              where: {
                role: Role.ADMIN,
                active: true,
              },
            });
            if (activeAdminsCount <= 1) {
              throw { statusCode: 400, message: 'Não é possível desativar o único administrador ativo do sistema' };
            }
          }
        }
      }
    }

    // monta o update so com os campos que vieram.
    const updateData: any = {};

    // nome nao pode ser vazio quando veio.
    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) {
        throw { statusCode: 400, message: 'Nome não pode ser vazio' };
      }
      updateData.name = cleanName;
    }

    // email valida formato e unicidade (se mudou em relacao ao atual).
    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase();
      this.validateEmail(cleanEmail);

      if (cleanEmail !== user.email) {
        const emailOccupied = await this.userRepo.findByEmail(cleanEmail);
        if (emailOccupied) {
          throw { statusCode: 409, message: 'Email já cadastrado para outro usuário' };
        }
      }
      updateData.email = cleanEmail;
    }

    // senha em branco nao sobrescreve. se veio valor, valida e hasheia.
    if (data.password !== undefined) {
      if (data.password.trim() !== '') {
        this.validatePassword(data.password);
        updateData.password = await bcrypt.hash(data.password, 12);
      }
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    // campos opcionais aceitam null pra limpar.
    if (data.phone !== undefined) {
      let updatePhone = null;
      if (data.phone) {
        updatePhone = data.phone.trim();
      } else {
        updatePhone = null;
      }
      updateData.phone = updatePhone;
    }

    if (data.registerDoc !== undefined) {
      let updateRegisterDoc = null;
      if (data.registerDoc) {
        updateRegisterDoc = data.registerDoc.trim();
      } else {
        updateRegisterDoc = null;
      }
      updateData.registerDoc = updateRegisterDoc;
    }

    if (data.address !== undefined) {
      let updateAddress = null;
      if (data.address) {
        updateAddress = data.address.trim();
      } else {
        updateAddress = null;
      }
      updateData.address = updateAddress;
    }

    if (data.birthDate !== undefined) {
      let updateBirthDate = null;
      if (data.birthDate) {
        updateBirthDate = data.birthDate;
      } else {
        updateBirthDate = null;
      }
      updateData.birthDate = updateBirthDate;
    }

    if (data.active !== undefined) {
      updateData.active = Boolean(data.active);
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions;
    }

    // chama o repositorio (/repositories/user-repository.ts) pra persistir.
    // ele tambem sincroniza o cadastro de paciente quando os campos batem.
    const updated = await this.userRepo.update(id, updateData);

    await this.logService.log(
      adminId,
      'update',
      'users',
      id,
      `Atualizou usuário ${updated.name}`
    );

    return this.sanitizeUser(updated);
  }

  // ativa ou desativa um usuario. mesma trava do update: nao deixa
  // desativar o ultimo admin ativo. a acao gera log diferente
  // (activate ou deactivate) pra ficar claro o que aconteceu.
  async toggleActive(adminId: number, id: number, active: boolean) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // trava: nao desativar o ultimo admin ativo.
    if (user.role === Role.ADMIN) {
      if (user.active) {
        if (Boolean(active) === false) {
          const activeAdminsCount = await prisma.user.count({
            where: {
              role: Role.ADMIN,
              active: true,
            },
          });
          if (activeAdminsCount <= 1) {
            throw { statusCode: 400, message: 'Não é possível desativar o único administrador ativo do sistema' };
          }
        }
      }
    }

    // chama o repositorio (/repositories/user-repository.ts) pra
    // atualizar so o campo active.
    const updated = await this.userRepo.update(id, { active: Boolean(active) });

    // monta a acao do log de acordo com o novo estado.
    let actionLog = 'deactivate';
    let actionMessage = 'Desativou';
    if (active) {
      actionLog = 'activate';
      actionMessage = 'Ativou';
    } else {
      actionLog = 'deactivate';
      actionMessage = 'Desativou';
    }

    await this.logService.log(
      adminId,
      actionLog,
      'users',
      id,
      `${actionMessage} usuário ${updated.name}`
    );

    return this.sanitizeUser(updated);
  }

  // exclui um usuario. trava principal: admin nao pode excluir a si mesmo
  // (evita perder a propria conta sem querer).
  async deleteUser(adminId: number, id: number) {
    if (adminId === id) {
      throw { statusCode: 400, message: 'Um administrador não pode excluir a própria conta' };
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // chama o repositorio (/repositories/user-repository.ts) pra excluir.
    await this.userRepo.delete(id);

    await this.logService.log(
      adminId,
      'delete',
      'users',
      id,
      `Excluiu usuário ${user.name}`
    );

    return { message: 'Usuário excluído com sucesso' };
  }
}