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

// 3. Detalhar um descarte específico - Acesso Geral
disposalRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const disposal = await prisma.disposal.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, name: true, role: true } },
        batch: { include: { medicine: true } },
      },
    });

    if (!disposal) {
      return res.status(404).json({ error: 'Descarte não encontrado.' });
    }

    return res.json(disposal);
  } catch (error) {
    console.error('Erro ao detalhar descarte:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar descarte.' });
  }
});

// 4. Atualizar descarte - apenas o motivo - Protegido
disposalRoutes.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingDisposal = await prisma.disposal.findUnique({
      where: { id: Number(id) },
    });

    if (!existingDisposal) {
      return res.status(404).json({ error: 'Descarte não encontrado.' });
    }

    if (reason === undefined || typeof reason !== 'string') {
      return res.status(400).json({ error: 'O motivo do descarte é obrigatório.' });
    }

    const updatedDisposal = await prisma.disposal.update({
      where: { id: Number(id) },
      data: { reason },
      include: { batch: { include: { medicine: true } } },
    });

    return res.json(updatedDisposal);
  } catch (error) {
    console.error('Erro ao atualizar descarte:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar descarte.' });
  }
});

// 5. Reverter descarte - restaura a quantidade no lote (se o lote ainda existir)
disposalRoutes.post('/:id/revert', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const disposal = await prisma.disposal.findUnique({
      where: { id: Number(id) },
      include: { batch: true },
    });

    if (!disposal) {
      return res.status(404).json({ error: 'Descarte não encontrado.' });
    }

    if (disposal.reverted) {
      return res.status(400).json({ error: 'Este descarte já foi revertido.' });
    }

    // Regra: reverter exige que o lote ainda exista
    if (!disposal.batch) {
      return res.status(400).json({
        error: 'Não é possível reverter: o lote associado não existe mais.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockBatch.update({
        where: { id: disposal.batchId },
        data: { currentQuantity: { increment: disposal.quantity } },
      });
      await tx.disposal.update({
        where: { id: disposal.id },
        data: { reverted: true },
      });
    });

    return res.json({
      message: 'Descarte revertido e estoque restaurado com sucesso.',
      restoredQuantity: disposal.quantity,
    });
  } catch (error) {
    console.error('Erro ao reverter descarte:', error);
    return res.status(500).json({ error: 'Erro interno ao reverter descarte.' });
  }
});

// 6. Remover registro de descarte (sem restaurar estoque - use revert para isso) - Protegido
disposalRoutes.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingDisposal = await prisma.disposal.findUnique({
      where: { id: Number(id) },
    });

    if (!existingDisposal) {
      return res.status(404).json({ error: 'Descarte não encontrado.' });
    }

    await prisma.disposal.delete({ where: { id: Number(id) } });

    return res.json({ message: 'Registro de descarte removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover descarte:', error);
    return res.status(500).json({ error: 'Erro interno ao remover descarte.' });
  }
});

export { disposalRoutes };