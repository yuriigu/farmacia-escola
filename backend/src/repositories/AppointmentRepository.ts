import { prisma } from '../utils/prisma';

export class AppointmentRepository {
  async findAll(patientId?: number) {
    const where = patientId ? { patientId } : {};

    return prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        slot: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
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
              select: {
                id: true,
                batchNumber: true,
                expirationDate: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        slot: {
          include: {
            assignedTo: { select: { id: true, name: true, role: true } },
          },
        },
        items: {
          include: {
            medicine: true,
            batch: true,
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
    return prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          patientId: data.patientId,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          slotId: data.slotId,
          notes: data.notes,
        },
        include: {
          patient: true,
          slot: {
            include: {
              assignedTo: { select: { id: true, name: true, role: true } },
            },
          },
          items: {
            include: {
              medicine: true,
            },
          },
        },
      });

      for (const item of data.items) {
        await tx.appointmentItem.create({
          data: {
            appointmentId: created.id,
            medicineId: item.medicineId,
            quantity: item.quantity,
          },
        });
      }

      return tx.appointment.findUnique({
        where: { id: created.id },
        include: {
          patient: true,
          slot: {
            include: {
              assignedTo: { select: { id: true, name: true, role: true } },
            },
          },
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
        },
      });
    });
  }

  async updateStatus(id: number, status: string, notes?: string) {
    return prisma.appointment.update({
      where: { id },
      data: {
        status: status as any,
        ...(notes !== undefined ? { notes } : {}),
      },
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
        items: { include: { medicine: true, batch: true } },
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