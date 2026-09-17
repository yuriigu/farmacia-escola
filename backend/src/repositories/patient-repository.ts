import { prisma } from '../utils/prisma';

export class PatientRepository {
  // OTIMIZADO: paginação opcional + limite padrão de segurança. A listagem de
  // pacientes alimenta autocomplete de CPF (dispara a cada 3 dígitos); sem
  // limite o backend varria a tabela inteira a cada keystroke.
  async findAll(search?: string, pagination?: { take?: number; skip?: number }) {
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
      take: pagination?.take ?? 100,
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  async findById(id: number) {
    // OTIMIZADO: limite + ordenação aplicados no banco para o histórico do
    // paciente + projections enxutas (antes trazia `medicine: true`,
    // `batch: true`, `slot: true` completos sem limite).
    return prisma.patient.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, email: true } },
        appointments: {
          include: {
            slot: { select: { id: true, date: true, timeSlot: true } },
            batch: { include: { medicine: { select: { id: true, name: true, dosage: true } } } },
            dispensedByUser: { select: { id: true, name: true, role: true } },
            items: {
              include: {
                medicine: { select: { id: true, name: true, dosage: true } },
                batch: { select: { id: true, batchNumber: true, expirationDate: true } },
              },
            },
          },
          orderBy: { scheduledDate: 'desc' },
          take: 50,
        },
      },
    });
  }

  async findByCpf(cpf: string) {
    // Normaliza o CPF removendo formatação para busca consistente.
    // O banco legado/seed guarda CPF formatado (ex: 123.456.789-00),
    // então é preciso buscar tanto pela versão limpa quanto pela formatada.
    // OTIMIZADO: tenta igualdades exatas indexadas (cpf é @unique) antes de
    // qualquer LIKE; o fallback normalizado usa $queryRaw com REPLACE() em
    // UMA única query em vez de carregar até 200 linhas para a memória.
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.length === 11
      ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`
      : cpf;
    const prismaAny = prisma as any;
    const exactHit = await prismaAny.patient.findFirst({
      where: {
        OR: [{ cpf: cleanCpf }, { cpf: formattedCpf }],
        deletedAt: null,
      },
    });
    if (exactHit) {
      return exactHit;
    }
    // LIKE apenas quando a igualdade exata falha (mantém compatibilidade
    // com variações parciais). `contains` não usa índice, mas roda só no
    // caminho excepcional.
    try {
      const likeHit = await prismaAny.patient.findFirst({
        where: {
          OR: [{ cpf: { contains: cleanCpf } }, { cpf: { contains: formattedCpf } }],
          deletedAt: null,
        },
      });
      if (likeHit) {
        return likeHit;
      }
    } catch {
      // Em SQLite/LibSQL o filtro `contains` com OR sobre a mesma coluna
      // pode quebrar a tradução do Prisma; cai para o fallback SQL abaixo.
    }
    // Fallback final em SQL único com normalização no banco (sem trazer
    // linhas para memória). Limit 1 + índice em cpf mantém custo O(log n).
    try {
      const rows: Array<{ id: number }> = await prismaAny.$queryRawUnsafe(
        'SELECT id FROM "Patient" WHERE deletedAt IS NULL AND REPLACE(REPLACE(REPLACE(cpf, \'.\', \'\'), \'-\', \'\'), \' \', \'\') = ? LIMIT 1',
        cleanCpf
      );
      if (rows && rows.length > 0) {
        return prismaAny.patient.findFirst({ where: { id: rows[0].id } });
      }
    } catch {
      return null;
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