import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { ActivityLogService } from './ActivityLogService';
import { Role } from '../types/Enums';

export class UserService {
  private userRepo: UserRepository;
  private logService: ActivityLogService;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor() {
    this.userRepo = new UserRepository();
    this.logService = new ActivityLogService();
  }

  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;

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

  private validateEmail(email: string) {
    if (!this.emailRegex.test(email)) {
      throw { statusCode: 400, message: 'Formato de email inválido' };
    }
  }

  private validatePassword(password: string) {
    if (password.length < 6) {
      throw { statusCode: 400, message: 'A senha deve ter pelo menos 6 caracteres' };
    }
  }

  async getAllUsers() {
    const users = await this.userRepo.findAll();
    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }
    return this.sanitizeUser(user);
  }

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

    this.validateEmail(cleanEmail);
    this.validatePassword(data.password);

    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      throw { statusCode: 409, message: 'Email já cadastrado' };
    }

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

    let permissionsVal = undefined;
    if (data.role === Role.ALUNO) {
      permissionsVal = data.permissions;
    } else {
      permissionsVal = undefined;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
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

    const updateData: any = {};

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) {
        throw { statusCode: 400, message: 'Nome não pode ser vazio' };
      }
      updateData.name = cleanName;
    }

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

    if (data.password !== undefined) {
      if (data.password.trim() !== '') {
        this.validatePassword(data.password);
        updateData.password = await bcrypt.hash(data.password, 10);
      }
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

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

  async toggleActive(adminId: number, id: number, active: boolean) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    const updated = await this.userRepo.update(id, { active: Boolean(active) });
    
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

  async deleteUser(adminId: number, id: number) {
    if (adminId === id) {
      throw { statusCode: 400, message: 'Um administrador não pode excluir a própria conta' };
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

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
