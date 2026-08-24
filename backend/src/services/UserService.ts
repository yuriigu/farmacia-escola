import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { ActivityLogService } from './ActivityLogService';
import { Role } from '@prisma/client';  // 👈 Importe o enum

export class UserService {
  private userRepo: UserRepository;
  private logService: ActivityLogService;

  constructor() {
    this.userRepo = new UserRepository();
    this.logService = new ActivityLogService();
  }

  async getAllUsers() {
    return this.userRepo.findAll();
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(adminId: number, data: {
    name: string;
    email: string;
    password: string;
    role: Role;  // 👈 Mude de string para Role
    registerDoc?: string | null;
    phone?: string | null;
    permissions?: any;
  }) {
    if (!data.name || !data.email || !data.password || !data.role) {
      throw { statusCode: 400, message: 'Nome, email, senha e perfil são obrigatórios' };
    }

    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw { statusCode: 409, message: 'Email já cadastrado' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.create({
      ...data,
      password: hashedPassword,
      permissions: data.role === 'ALUNO' ? data.permissions : undefined,
    });

    await this.logService.log(
      adminId,
      'create',
      'users',
      user.id,
      `Criou usuário ${user.name} (${user.role})`
    );

    return user;
  }

  async updateUser(adminId: number, id: number, data: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;  // 👈 Mude de string para Role
    registerDoc?: string | null;
    phone?: string | null;
    active?: boolean;
    permissions?: any;
  }) {
    const user = await this.userRepo.findById(id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.userRepo.update(id, updateData);

    await this.logService.log(
      adminId,
      'update',
      'users',
      id,
      `Atualizou usuário ${updated.name}`
    );

    return updated;
  }

  async toggleActive(adminId: number, id: number, active: boolean) {
    const updated = await this.userRepo.update(id, { active });
    await this.logService.log(
      adminId,
      active ? 'activate' : 'deactivate',
      'users',
      id,
      `${active ? 'Ativou' : 'Desativou'} usuário ${updated.name}`
    );
    return updated;
  }
}