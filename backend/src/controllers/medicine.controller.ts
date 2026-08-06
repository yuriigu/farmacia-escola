import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { formatMedicineList } from '../lib/formatters';

export class MedicineController {
  // Listar todos os medicamentos
  async list(_req: Request, res: Response) {
    try {
      const medicines = await prisma.medicine.findMany({
        include: {
          batches: {
            select: { currentQuantity: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json(formatMedicineList(medicines));
    } catch (error) {
      console.error('Erro ao listar medicamentos:', error);
      return res.status(500).json({ error: 'Erro interno ao listar medicamentos.' });
    }
  }

  // Buscar medicamento por ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const medicine = await prisma.medicine.findUnique({
        where: { id: Number(id) },
        include: {
          batches: {
            select: { currentQuantity: true },
          },
        },
      });

      if (!medicine) {
        return res.status(404).json({ error: 'Medicamento não encontrado.' });
      }

      return res.json(formatMedicineList([medicine])[0]);
    } catch (error) {
      console.error('Erro ao buscar medicamento:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar medicamento.' });
    }
  }

  // Criar novo medicamento
  async create(req: Request, res: Response) {
    try {
      const { name, activeIngredient, dosage, accessibleDesc } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome do medicamento é obrigatório.' });
      }

      const medicine = await prisma.medicine.create({
        data: {
          name,
          activeIngredient: activeIngredient || null,
          dosage: dosage || null,
          accessibleDesc: accessibleDesc || null,
        },
      });

      return res.status(201).json(medicine);
    } catch (error) {
      console.error('Erro ao criar medicamento:', error);
      return res.status(500).json({ error: 'Erro interno ao criar medicamento.' });
    }
  }

  // Atualizar medicamento
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, activeIngredient, dosage, accessibleDesc } = req.body;

      const existingMedicine = await prisma.medicine.findUnique({
        where: { id: Number(id) },
      });

      if (!existingMedicine) {
        return res.status(404).json({ error: 'Medicamento não encontrado.' });
      }

      const medicine = await prisma.medicine.update({
        where: { id: Number(id) },
        data: {
          name: name ?? existingMedicine.name,
          activeIngredient: activeIngredient !== undefined ? activeIngredient : existingMedicine.activeIngredient,
          dosage: dosage !== undefined ? dosage : existingMedicine.dosage,
          accessibleDesc: accessibleDesc !== undefined ? accessibleDesc : existingMedicine.accessibleDesc,
        },
      });

      return res.json(medicine);
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      return res.status(500).json({ error: 'Erro interno ao atualizar medicamento.' });
    }
  }

  // Deletar medicamento
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingMedicine = await prisma.medicine.findUnique({
        where: { id: Number(id) },
      });

      if (!existingMedicine) {
        return res.status(404).json({ error: 'Medicamento não encontrado.' });
      }

      // Regra de negócio: não permitir excluir se houver lotes com estoque disponível (> 0)
      const activeBatches = await prisma.stockBatch.findMany({
        where: { medicineId: Number(id) },
        select: { currentQuantity: true },
      });

      if (activeBatches.some((batch) => batch.currentQuantity > 0)) {
        return res.status(400).json({
          error: 'Não é possível excluir: o medicamento possui lotes com estoque disponível.',
        });
      }

      // Também não permitir excluir se houver agendamentos vinculados
      const appointmentsCount = await prisma.appointment.count({
        where: { medicineId: Number(id) },
      });

      if (appointmentsCount > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir: o medicamento possui agendamentos vinculados.',
        });
      }

      // Remove lotes com quantidade zerada e o medicamento, em transação
      await prisma.$transaction([
        prisma.stockBatch.deleteMany({ where: { medicineId: Number(id) } }),
        prisma.medicine.delete({ where: { id: Number(id) } }),
      ]);

      return res.json({ message: 'Medicamento excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir medicamento:', error);
      return res.status(500).json({ error: 'Erro interno ao excluir medicamento.' });
    }
  }
}