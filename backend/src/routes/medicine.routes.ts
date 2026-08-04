import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { formatMedicineList } from '../lib/formatters';
import { authMiddleware } from '../middlewares/auth.middleware';

const medicineRoutes = Router();

// 1. Cadastrar Medicamento (Protegido - Exige Token JWT)
medicineRoutes.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, activeIngredient, dosage, accessibleDesc } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome do medicamento é obrigatório.' });
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        activeIngredient,
        dosage,
        accessibleDesc,
      },
    });

    return res.status(201).json(medicine);
  } catch (error) {
    console.error('Erro ao cadastrar medicamento:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar medicamento.' });
  }
});

// 2. Listar todos os Medicamentos com a soma total do Estoque (Acesso Geral)
medicineRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      include: {
        batches: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json(formatMedicineList(medicines));
  } catch (error) {
    console.error('Erro ao listar medicamentos:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar medicamentos.' });
  }
});

// 3. Obter um Medicamento por ID com detalhamento dos seus lotes
medicineRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(id) },
      include: {
        batches: {
          orderBy: { expirationDate: 'asc' },
        },
      },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicamento não encontrado.' });
    }

    const totalQuantity = medicine.batches.reduce(
      (acc, batch) => acc + batch.currentQuantity,
      0
    );

    return res.json({
      ...medicine,
      totalQuantity,
    });
  } catch (error) {
    console.error('Erro ao buscar medicamento:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar medicamento.' });
  }
});

// 4. Excluir Medicamento (Protegido - Exige Token JWT)
medicineRoutes.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: { batches: true },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicamento não encontrado.' });
    }

    const hasStock = medicine.batches.some((batch) => batch.currentQuantity > 0);
    if (hasStock) {
      return res.status(400).json({
        error: 'Não é possível excluir medicamento com lotes em estoque.',
      });
    }

    await prisma.medicine.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir medicamento:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir medicamento.' });
  }
});

export { medicineRoutes };