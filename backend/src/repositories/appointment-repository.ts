import { prisma } from '../utils/prisma';

// repositorio de agendamento. e a camada que fala direto com o prisma
// pra ler e gravar consultas. o service usa essa classe pra nao lidar
// com detalhes do banco.
export class AppointmentRepository {
  // lista agendamentos. aceita filtro por paciente e paginacao opcional
  // (take/skip), porque essa e uma das tabelas mais pesadas do sistema.
  // sem paginacao o comportamento continua o mesmo de antes, mantendo
  // compatibilidade com consumidores e testes existentes.
  // as projections sao enxutas de proposito, pra trazer so os campos
  // que a tela realmente usa.
  async findAll(patientId?: number, pagination?: { take?: number; skip?: number }) {
    // por padrao, so consultas de pacientes nao deletados.
    // se veio patientId, apertamos o filtro pra esse paciente especifico.
    let where: any = {
      patient: {
        deletedAt: null,
      },
    };
    if (patientId) {
      where = {
        patientId: patientId,
        patient: {
          deletedAt: null,
        },
      };
    }

    return prisma.appointment.findMany({
      where: where,
      include: {
        patient: { select: { id: true, name: true, cpf: true, phone: true } },
        slot: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
        },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
        dispensedByUser: {
          select: { id: true, name: true, role: true },
        },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                name: true,
                dosage: true,
                activeIngredient: true,
              },
            },
            batch: {
              include: {
                medicine: { select: { id: true, name: true, dosage: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      // aplica take/skip so quando o chamador passou valores,
      // mantendo o comportamento antigo (sem paginacao) por padrao.
      ...(pagination?.take ? { take: pagination.take } : {}),
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  // busca um agendamento por id, com os relacionamentos mais completos
  // (inclusive birthDate e address do paciente) porque essa consulta
  // costuma alimentar a tela de detalhe.
  async findById(id: number) {
    // mesmo padrao de projections enxutas do findAll, so que aqui
    // abrimos um pouco mais o paciente por ser tela de detalhe.
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, cpf: true, phone: true, birthDate: true, address: true } },
        slot: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
        },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } },
          },
        },
        dispensedByUser: {
          select: { id: true, name: true, role: true },
        },
        items: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } },
            batch: {
              include: {
                medicine: { select: { id: true, name: true, dosage: true } },
              },
            },
          },
        },
      },
    });
  }

  // cria um agendamento junto com os itens dele, tudo numa transacao
  // pra nao deixar consulta orfa se algo falhar no meio.
  async create(data: {
    patientId: number;
    scheduledDate: Date;
    scheduledTime?: string | null;
    slotId?: number | null;
    notes?: string | null;
    items: Array<{ medicineId: number; quantity: number }>;
  }) {
    // aqui a gente usa transaction pra garantir atomicidade:
    // - cria a consulta e devolve so o id
    // - insere todos os itens com createMany (1 round-trip em vez de N)
    // - busca a consulta ja com os relacionamentos pra devolver pronta
    return prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          patientId: data.patientId,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          slotId: data.slotId,
          notes: data.notes,
        },
        select: { id: true },
      });

      await tx.appointmentItem.createMany({
        data: data.items.map((item) => ({
          appointmentId: created.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
        })),
      });

      return tx.appointment.findUnique({
        where: { id: created.id },
        include: {
          patient: { select: { id: true, name: true, cpf: true, phone: true } },
          slot: {
            include: {
              assignedTo: { select: { id: true, name: true, role: true } },
            },
          },
          items: {
            include: {
              medicine: { select: { id: true, name: true, dosage: true, activeIngredient: true } },
            },
          },
        },
      });
    });
  }

  // atualiza so o status da consulta (e opcionalmente as notas).
  // o when notes !== undefined evita apagar uma nota existente quando
  // o campo nao veio no payload.
  async updateStatus(id: number, status: string, notes?: string) {
    const updateData: any = {
      status: status as any,
    };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    return prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        slot: true,
        items: { include: { medicine: true } },
      },
    });
  }

  // atualiza os dados gerais da consulta (data, horario, slot, notas, status).
  // aqui pode ser update parcial, entao repassamos o que veio.
  async update(
    id: number,
    data: {
      scheduledDate?: Date;
      scheduledTime?: string | null;
      slotId?: number | null;
      status?: string;
      notes?: string | null;
    }
  ) {
    const updateData: any = { ...data };
    if (data.status) {
      updateData.status = data.status as any;
    }
    return prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        slot: true,
        items: { include: { medicine: true } },
      },
    });
  }

  // apaga a consulta e os itens dela numa transacao.
  // a ordem importa: primeiro os itens (que referenciam a consulta),
  // depois a consulta em si. assim nao quebra constraint de fk.
  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      await tx.appointmentItem.deleteMany({
        where: { appointmentId: id },
      });
      return tx.appointment.delete({
        where: { id },
      });
    });
  }
}