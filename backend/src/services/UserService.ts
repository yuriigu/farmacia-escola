import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { ActivityLogService } from './ActivityLogService';
import { Role } from '../types/enums';

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
    return userWithoutPassword;
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
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };
    return this.sanitizeUser(user);
  }

  async createUser(adminId: number, data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    registerDoc?: string | null;
    phone?: string | null;
    permissions?: any;
  }) {
    const cleanName = data.name?.trim();
    const cleanEmail = data.email?.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !data.password || !data.role) {
      throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
    }

    this.validateEmail(cleanEmail);
    this.validatePassword(data.password);

    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      throw { statusCode: 409, message: 'Email já cadastrado' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.create({
      ...data,
      name: cleanName,
      email: cleanEmail,
      phone: data.phone?.trim() || null,
      registerDoc: data.registerDoc?.trim() || null,
      password: hashedPassword,
      permissions: data.role === Role.ALUNO ? data.permissions : undefined,
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
    active?: boolean;
    permissions?: any;
  }) {
    const user = await this.userRepo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };

    const updateData: any = {};

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      if (!cleanName) throw { statusCode: 400, message: 'Nome não pode ser vazio' };
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
      this.validatePassword(data.password);
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.registerDoc !== undefined) updateData.registerDoc = data.registerDoc?.trim() || null;
    if (data.active !== undefined) updateData.active = Boolean(data.active);
    if (data.permissions !== undefined) updateData.permissions = data.permissions;

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
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };

    const updated = await this.userRepo.update(id, { active: Boolean(active) });
    
    await this.logService.log(
      adminId,
      active ? 'activate' : 'deactivate',
      'users',
      id,
      `${active ? 'Ativou' : 'Desativou'} usuário ${updated.name}`
    );

    return this.sanitizeUser(updated);
  }

  async deleteUser(adminId: number, id: number) {
    if (adminId === id) {
      throw { statusCode: 400, message: 'Um administrador não pode excluir a própria conta' };
    }

    const user = await this.userRepo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };

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