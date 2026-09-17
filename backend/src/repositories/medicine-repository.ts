import { prisma } from '../utils/prisma';

export class MedicineRepository {
  async findAll() {
    // OTIMIZADO: projection de batches restrita aos campos usados no cálculo
    // de status/estoque (antes `batches: true` trazia colunas pesadas como
    // supplier/blockReason para todas as linhas em toda listagem).
    return prisma.medicine.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        batches: {
          select: {
            id: true,
            medicineId: true,
            batchNumber: true,
            currentQuantity: true,
            expirationDate: true,
            isBlocked: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.medicine.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        batches: {
          select: {
            id: true,
            medicineId: true,
            batchNumber: true,
            currentQuantity: true,
            expirationDate: true,
            manufacturingDate: true,
            supplier: true,
            isBlocked: true,
            blockReason: true,
            receivedAt: true,
          },
        },
      },
    });
  }

  async create(data: {
    name: string;
    activeIngredient?: string | null;
    dosage?: string | null;
    dosageValue?: number | null;
    dosageUnit?: string | null;
    minQuantity?: number | null;
    accessibleDesc?: string | null;
    category?: string | null;
  }) {
    return prisma.medicine.create({
      data,
      include: { batches: true },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      activeIngredient?: string | null;
      dosage?: string | null;
      dosageValue?: number | null;
      dosageUnit?: string | null;
      minQuantity?: number | null;
      accessibleDesc?: string | null;
      category?: string | null;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.medicine.update({
      where: { id },
      data,
      include: { batches: true },
    });
  }

  async delete(id: number) {
    return prisma.medicine.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}