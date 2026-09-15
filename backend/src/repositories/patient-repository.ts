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
          select: { appointments: true },
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
            batch: { include: { medicine: true } },
            dispensedByUser: { select: { id: true, name: true, role: true } },
            items: { include: { medicine: true, batch: true } },
          },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });
  }

  async findByCpf(cpf: string) {
    // Normaliza o CPF removendo formatação para busca consistente.
    // O banco legado/seed guarda CPF formatado (ex: 123.456.789-00),
    // então é preciso buscar tanto pela versão limpa quanto pela formatada.
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.length === 11
      ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`
      : cpf;
    const prismaAny = prisma as any;
    // Em SQLite/LibSQL o filtro `contains` com OR sobre a mesma coluna
    // quebra a tradução do Prisma; por isso tenta igualdades exatas
    // primeiro e só usa `contains` se necessário.
    const exactHit = await prismaAny.patient.findFirst({
      where: {
        OR: [{ cpf: cleanCpf }, { cpf: formattedCpf }],
        deletedAt: null,
      },
    });
    if (exactHit) {
      return exactHit;
    }
    let likeHit = null;
    try {
      likeHit = await prismaAny.patient.findFirst({
        where: {
          OR: [{ cpf: { contains: cleanCpf } }, { cpf: { contains: formattedCpf } }],
          deletedAt: null,
        },
      });
    } catch {
      likeHit = null;
    }
    if (likeHit) {
      return likeHit;
    }
    // Fallback defensivo: compara CPFs ignorando pontuação (cobre
    // variações de formatação que o LIKE acima não alcança).
    const candidates = await prismaAny.patient.findMany({
      where: { deletedAt: null },
      take: 200,
    });
    for (const candidate of candidates) {
      if (String(candidate.cpf).replace(/\D/g, '') === cleanCpf) {
        return candidate;
      }
    }
    return null;
  }

  async findByUserId(userId: number) {
    return prisma.patient.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { appointments: true },
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