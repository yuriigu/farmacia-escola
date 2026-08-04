import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { formatBatchAlerts } from '../lib/formatters';
import { authMiddleware } from '../middlewares/auth.middleware';

const batchRoutes = Router();

// 1. Alertas de validade e lotes zerados (Acesso Geral)
batchRoutes.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.stockBatch.findMany({
      include: {
        medicine: {
          select: {
            name: true,
            dosage: true,
          },
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    return res.json(formatBatchAlerts(batches));
  } catch (error) {
    console.error('Erro ao listar alertas de lotes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar alertas.' });
  }
});

// 1. Cadastrar Novo Lote para um Medicamento (Protegido - Exige Token JWT)
batchRoutes.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicineId, batchNumber, currentQuantity, expirationDate } = req.body;

    if (!medicineId || !batchNumber || currentQuantity === undefined || !expirationDate) {
      return res.status(400).json({
        error: 'Campos obrigatórios: medicineId, batchNumber, currentQuantity e expirationDate.',
      });
    }

    // Verifica se o medicamento informado existe
    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicamento informado não existe.' });
    }

    const batch = await prisma.stockBatch.create({
      data: {
        medicineId: Number(medicineId),
        batchNumber: String(batchNumber),
        currentQuantity: Number(currentQuantity),
        expirationDate: new Date(expirationDate),
      },
    });

    return res.status(201).json(batch);
  } catch (error) {
    console.error('Erro ao cadastrar lote:', error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar lote.' });
  }
});

// 2. Listar Lotes (Protegido - opcionalmente filtrando por medicineId)
batchRoutes.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicineId } = req.query;

    const whereCondition = medicineId
      ? { medicineId: Number(medicineId) }
      : {};

    const batches = await prisma.stockBatch.findMany({
      where: whereCondition,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            dosage: true,
          },
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    return res.json(batches);
  } catch (error) {
    console.error('Erro ao listar lotes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar lotes.' });
  }
});

export { batchRoutes };