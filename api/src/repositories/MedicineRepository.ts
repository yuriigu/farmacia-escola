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

  async create(data: { name: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) {
    return prisma.medicine.create({ data });
  }

  async update(id: number, data: { name?: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) {
    return prisma.medicine.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.medicine.delete({ where: { id } });
  }
}