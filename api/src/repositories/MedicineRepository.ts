import { prisma } from '../utils/prisma';

export class MedicineRepository {
  async findAll() {
    return prisma.medicine.findMany({
      include: {
        batches: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.medicine.findUnique({
      where: { id },
      include: { batches: true },
    });
  }

  async create(data: {
    name: string;
    activeIngredient?: string | null;
    dosage?: string | null;
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
      accessibleDesc?: string | null;
      category?: string | null;
    }
  ) {
    return prisma.medicine.update({
      where: { id },
      data,
      include: { batches: true },
    });
  }

  async delete(id: number) {
    return prisma.medicine.delete({ where: { id } });
  }
}
