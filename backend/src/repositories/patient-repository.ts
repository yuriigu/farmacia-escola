import { prisma } from '../utils/prisma';

export class PatientRepository {
  async findAll(search?: string) {
    let where: any = {
      deletedAt: null,
    };

    if (search) {
      where = {
        deletedAt: null,
        OR: [
          { name: { contains: search } },
          { cpf: { contains: search } },
        ],
      };
    }

    return prisma.patient.findMany({
      where: where,
      include: {
        _count: {
          select: { withdrawals: true, appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.patient.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
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
    return prisma.patient.findFirst({
      where: {
        cpf: cpf,
        deletedAt: null,
      },
    });
  }

  async findByUserId(userId: number) {
    return prisma.patient.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
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
      where: { id: id },
      data: data,
    });
  }

  async delete(id: number) {
    return prisma.patient.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}