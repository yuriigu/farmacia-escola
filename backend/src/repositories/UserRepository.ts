import { prisma } from '../utils/prisma';
import { Role } from '../types/enums';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { patient: true },
    });
  }

  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { patient: true },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
        patient: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    registerDoc?: string | null;
    phone?: string | null;
    permissions?: any;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        registerDoc: data.registerDoc,
        phone: data.phone,
        permissions: data.permissions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      registerDoc?: string | null;
      phone?: string | null;
      active?: boolean;
      permissions?: any;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registerDoc: true,
        phone: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  }
}