import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { formatDisposals } from '../lib/formatters';
import { authMiddleware } from '../middlewares/auth.middleware';

const disposalRoutes = Router();

// 1. Registrar o Descarte de um Lote (Protegido por JWT)
disposalRoutes.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { batchId, quantity, reason } = req.body;
    const user = (req as any).user;

    if (!batchId || !quantity || quantity <= 0 || !reason) {
      return res.status(400).json({
        error: 'ID do lote, quantidade válida e o motivo do descarte são obrigatórios.',
      });
    }

    // Busca o lote para checar disponibilidade
    const batch = await prisma.stockBatch.findUnique({
      where: { id: Number(batchId) },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado.' });
    }

    if (batch.currentQuantity < Number(quantity)) {
      return res.status(400).json({
        error: `Quantidade para descarte é maior que o saldo do lote (${batch.currentQuantity}).`,
      });
    }

    // Executa a baixa no estoque e grava o motivo em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.stockBatch.update({
        where: { id: Number(batchId) },
        data: {
          currentQuantity: {
            decrement: Number(quantity),
          },
        },
      });

      const disposal = await tx.disposal.create({
        data: {
          batchId: Number(batchId),
          userId: Number(user.id),
          quantity: Number(quantity),
          reason,
        },
        include: {
          batch: {
            include: { medicine: true },
          },
        },
      });

      return { disposal, remainingStock: updatedBatch.currentQuantity };
    });

    return res.status(201).json({
      message: 'Descarte registrado com sucesso!',
      disposal: result.disposal,
      remainingStock: result.remainingStock,
    });
  } catch (error) {
    console.error('Erro ao registrar descarte:', error);
    return res.status(500).json({ error: 'Erro interno ao registrar descarte.' });
  }
});

// 2. Listar histórico de descartes (Acesso Geral)
disposalRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const disposals = await prisma.disposal.findMany({
      include: {
        user: { select: { id: true, name: true, role: true } },
        batch: {
          include: { medicine: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.json(formatDisposals(disposals));
  } catch (error) {
    console.error('Erro ao listar descartes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar histórico de descartes.' });
  }
});

export { disposalRoutes };