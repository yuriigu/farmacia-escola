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

// 3. Detalhar um lote específico (Protegido)
batchRoutes.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.stockBatch.findUnique({
      where: { id: Number(id) },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            dosage: true,
          },
        },
        withdrawalItems: true,
        disposals: true,
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado.' });
    }

    return res.json(batch);
  } catch (error) {
    console.error('Erro ao detalhar lote:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar lote.' });
  }
});

// 4. Atualizar lote (quantidade, validade, número do lote) - Protegido
batchRoutes.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { batchNumber, currentQuantity, expirationDate } = req.body;

    const existingBatch = await prisma.stockBatch.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBatch) {
      return res.status(404).json({ error: 'Lote não encontrado.' });
    }

    // Valida quantidade: não pode ser negativa nem não numérica
    if (
      currentQuantity !== undefined &&
      (!Number.isFinite(Number(currentQuantity)) || Number(currentQuantity) < 0)
    ) {
      return res.status(400).json({
        error: 'A quantidade deve ser um número maior ou igual a zero.',
      });
    }

    const data: Record<string, unknown> = {};
    if (batchNumber !== undefined) data.batchNumber = String(batchNumber);
    if (currentQuantity !== undefined) data.currentQuantity = Number(currentQuantity);
    if (expirationDate !== undefined) {
      const parsedExpiration = new Date(String(expirationDate));
      if (Number.isNaN(parsedExpiration.getTime())) {
        return res.status(400).json({ error: 'Data de validade inválida.' });
      }
      data.expirationDate = parsedExpiration;
    }

    const updatedBatch = await prisma.stockBatch.update({
      where: { id: Number(id) },
      data,
      include: {
        medicine: {
          select: { id: true, name: true, dosage: true },
        },
      },
    });

    return res.json(updatedBatch);
  } catch (error) {
    console.error('Erro ao atualizar lote:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar lote.' });
  }
});

// 5. Remover lote - apenas se quantidade = 0 (ou force=true no query) - Protegido
batchRoutes.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const existingBatch = await prisma.stockBatch.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBatch) {
      return res.status(404).json({ error: 'Lote não encontrado.' });
    }

    if (existingBatch.currentQuantity > 0 && force !== 'true') {
      return res.status(400).json({
        error: 'Não é possível excluir um lote com estoque disponível. Use force=true para forçar.',
      });
    }

    // Não permitir excluir lote referenciado por retiradas ou descartes (integridade referencial)
    const withdrawalItemsCount = await prisma.withdrawalItem.count({
      where: { batchId: Number(id) },
    });
    const disposalsCount = await prisma.disposal.count({
      where: { batchId: Number(id) },
    });

    if (withdrawalItemsCount > 0 || disposalsCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir o lote: ele possui retiradas ou descartes vinculados.',
      });
    }

    await prisma.stockBatch.delete({ where: { id: Number(id) } });

    return res.json({ message: 'Lote excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir lote:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir lote.' });
  }
});

export { batchRoutes };