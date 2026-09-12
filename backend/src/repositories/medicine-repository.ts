import { prisma } from '../utils/prisma';

export class MedicineRepository {
  async findAll() {
    return prisma.medicine.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        batches: true,
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
      include: { batches: true },
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