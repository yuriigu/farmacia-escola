import { prisma } from '../utils/Prisma';

export class PatientRepository {
  async findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { cpf: { contains: search } },
          ],
        }
      : {};

    return prisma.patient.findMany({
      where,
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        appointments: {
          include: {
            slot: true,
            items: { include: { medicine: true } },
          },
          orderBy: { scheduledDate: 'desc' },
        },
        withdrawals: {
          include: {
            items: { include: { batch: { include: { medicine: true } } } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  async findByCpf(cpf: string) {
    return prisma.patient.findUnique({
      where: { cpf },
    });
  }

  async findByUserId(userId: number) {
    return prisma.patient.findUnique({
      where: { userId },
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
    });
  }

  async create(data: {
    name: string;
    cpf: string;
    phone?: string | null;
    birthDate?: Date | null;
    address?: string | null;
    userId?: number | null;
  }) {
    return prisma.patient.create({
      data,
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      cpf?: string;
      phone?: string | null;
      birthDate?: Date | null;
      address?: string | null;
    }
  ) {
    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.patient.delete({
      where: { id },
    });
  }
}