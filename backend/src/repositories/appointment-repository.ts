import { prisma } from '../utils/prisma';

export class AppointmentRepository {
  // OTIMIZADO: paginação opcional (take/skip) para a tabela mais pesada do
  // sistema + projections enxutas. Sem paginação o comportamento é idêntico
  // ao anterior (compatível com testes/consumidores atuais).
  async findAll(patientId?: number, pagination?: { take?: number; skip?: number }) {
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
      ...(pagination?.take ? { take: pagination.take } : {}),
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  async findById(id: number) {
    // OTIMIZADO: projections enxutas (select) em vez de `medicine: true` /
    // `patient: true` completos — reduz payload e parsing em detalhe.
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

  async create(data: {
    patientId: number;
    scheduledDate: Date;
    scheduledTime?: string | null;
    slotId?: number | null;
    notes?: string | null;
    items: Array<{ medicineId: number; quantity: number }>;
  }) {
    // OTIMIZADO: createMany insere todos os items em 1 round-trip (em vez de
    // N creates sequenciais) + projections enxutas (select) em vez de
    // `medicine: true` / `patient: true` completos no retorno.
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