import { prisma } from '../utils/prisma';

export class BatchRepository {
  // Projeção enxuta de medicine usada nas listagens (evita `medicine: true`
  // completo em todas as linhas de estoque).
  private readonly medicineSelect = {
    id: true,
    name: true,
    dosage: true,
    activeIngredient: true,
    category: true,
  } as const;

  async findAll(medicineId?: number, pagination?: { take?: number; skip?: number }) {
    let where: any = {
      medicine: {
        deletedAt: null,
      },
    };
    if (medicineId) {
      where = {
        medicineId: medicineId,
        medicine: {
          deletedAt: null,
        },
      };
    }
    return prisma.stockBatch.findMany({
      where: where,
      include: { medicine: { select: this.medicineSelect } },
      orderBy: { expirationDate: 'asc' },
      take: pagination?.take ?? 200,
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  async findById(id: number) {
    return prisma.stockBatch.findFirst({
      where: {
        id: id,
        medicine: {
          deletedAt: null,
        },
      },
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  async findByMedicineAndBatchNumber(medicineId: number, batchNumber: string) {
    return prisma.stockBatch.findFirst({
      where: {
        medicineId: medicineId,
        batchNumber: batchNumber,
      },
    });
  }

  async create(data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: Date;
    manufacturingDate?: Date | null;
    supplier: string;
    isBlocked?: boolean;
    blockReason?: string | null;
  }) {
    return prisma.stockBatch.create({
      data,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  async updateQuantity(id: number, delta: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: { increment: delta } },
    });
  }

  async setQuantity(id: number, newQuantity: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: newQuantity },
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  async setBlockStatus(id: number, isBlocked: boolean, blockReason?: string | null) {
    let reasonValue: string | null = null;
    if (isBlocked) {
      if (blockReason) {
        reasonValue = blockReason;
      } else {
        reasonValue = null;
      }
    } else {
      reasonValue = null;
    }

    return prisma.stockBatch.update({
      where: { id },
      data: {
        isBlocked: isBlocked,
        blockReason: reasonValue,
      } as any,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  async update(
    id: number,
    data: {
      batchNumber?: string;
      expirationDate?: Date;
      manufacturingDate?: Date | null;
      supplier?: string;
    }
  ) {
    return prisma.stockBatch.update({
      where: { id },
      data,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  async delete(id: number) {
    return prisma.stockBatch.delete({ where: { id } });
  }
}