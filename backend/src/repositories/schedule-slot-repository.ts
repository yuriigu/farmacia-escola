import { prisma } from '../utils/prisma';

// repositorio de escala (slot de agenda). e a camada que fala direto
// com o prisma pra ler e gravar escalas. o service usa essa classe
// pra nao precisar conhecer detalhes do banco.
export class ScheduleSlotRepository {
  // lista as escalas ativas, com filtro opcional de periodo (data inicial
  // e final). aplica o filtro de data no proprio banco pra trazer so o
  // que interessa quando o front esta montando a agenda do periodo.
  async findAll(filters?: { startDate?: Date; endDate?: Date }) {
    // por padrao, so escalas ativas. o filtro de data entra apenas
    // quando pelo menos startDate foi informado.
    const where: Record<string, unknown> = { active: true };
    if (filters?.startDate && filters?.endDate) {
      where.date = { gte: filters.startDate, lte: filters.endDate };
    } else if (filters?.startDate) {
      where.date = { gte: filters.startDate };
    }

    // a contagem de consultas por slot e feita no banco via _count,
    // aproveitando o indice [slotId, status]. so contamos as que ainda
    // contam pra ocupacao (pending e confirmed), ignorando canceladas
    // e concluidas.
    const slots = await prisma.scheduleSlot.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        _count: {
          select: {
            appointments: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });

    return slots;
  }

  // busca uma escala pelo id, com os dados do responsavel e a lista
  // completa de consultas vinculadas. usado quando a tela precisa
  // detalhar o slot.
  async findById(id: number) {
    return prisma.scheduleSlot.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        appointments: true,
      },
    });
  }

  // cria uma nova escala. se maxCapacity nao vier, o padrao e 5;
  // se assignedToId nao vier, fica sem responsavel (null).
  async create(data: {
    date: Date;
    timeSlot: string;
    maxCapacity?: number;
    assignedToId?: number | null;
  }) {
    return prisma.scheduleSlot.create({
      data: {
        date: data.date,
        timeSlot: data.timeSlot,
        maxCapacity: data.maxCapacity ?? 5,
        assignedToId: data.assignedToId ?? null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });
  }

  // atualiza os dados de uma escala. aceita tanto mudanca de data,
  // horario e capacidade quanto troca ou remocao do responsavel
  // (assignedToId aceita null pra desvincular).
  async update(
    id: number,
    data: {
      date?: Date;
      timeSlot?: string;
      maxCapacity?: number;
      assignedToId?: number | null;
      active?: boolean;
    }
  ) {
    return prisma.scheduleSlot.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });
  }

  // remocao logica: em vez de apagar a linha, marca active=false.
  // assim o historico de consultas vinculadas ao slot continua integro
  // e a escala some das listagens, que filtram por active=true.
  async delete(id: number) {
    return prisma.scheduleSlot.update({
      where: { id },
      data: { active: false },
    });
  }
}