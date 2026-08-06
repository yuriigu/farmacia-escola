import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { formatWithdrawals } from '../lib/formatters';
import { authMiddleware } from '../middlewares/auth.middleware';

const withdrawalRoutes = Router();

// 1. Registrar uma Retirada de Medicamento (Protegido por JWT)
withdrawalRoutes.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientName, patientCpf, batchId, quantity, notes } = req.body;
    const user = (req as any).user; // ID do atendente extraído do Token JWT

    if (!patientName || !batchId || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Nome do paciente, ID do lote e quantidade válida são obrigatórios.',
      });
    }

    // 1. Busca o lote para verificar saldo disponível
    const batch = await prisma.stockBatch.findUnique({
      where: { id: Number(batchId) },
      include: { medicine: true },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Lote não encontrado.' });
    }

    if (batch.currentQuantity < Number(quantity)) {
      return res.status(400).json({
        error: `Estoque insuficiente no lote. Saldo atual: ${batch.currentQuantity}`,
      });
    }

    // 2. Executa a baixa no estoque e a gravação da retirada em uma transação no banco
    const result = await prisma.$transaction(async (tx) => {
      // Abate a quantidade do lote
      const updatedBatch = await tx.stockBatch.update({
        where: { id: Number(batchId) },
        data: {
          currentQuantity: {
            decrement: Number(quantity),
          },
        },
      });

      // Busca ou cria o paciente
      let patient = null;
      if (patientCpf) {
        patient = await tx.patient.findUnique({ where: { cpf: patientCpf } });
      }

      if (!patient) {
        patient = await tx.patient.create({
          data: {
            name: patientName,
            cpf: patientCpf || null,
          },
        });
      }

      // Registra a retirada
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: Number(user.id),
          patientId: patient.id,
          notes,
          items: {
            create: {
              batchId: Number(batchId),
              quantity: Number(quantity),
            },
          },
        },
        include: {
          patient: true,
          items: true,
        },
      });

      return { withdrawal, newBatchQuantity: updatedBatch.currentQuantity };
    });

    return res.status(201).json({
      message: 'Retirada realizada com sucesso!',
      withdrawal: result.withdrawal,
      remainingStock: result.newBatchQuantity,
    });
  } catch (error) {
    console.error('Erro ao registrar retirada:', error);
    return res.status(500).json({ error: 'Erro interno ao processar retirada.' });
  }
});

// 2. Listar histórico de retiradas (Acesso Geral)
withdrawalRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      include: {
        user: { select: { id: true, name: true, role: true } },
        patient: true,
        items: {
          include: {
            batch: {
              include: { medicine: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.json(formatWithdrawals(withdrawals));
  } catch (error) {
    console.error('Erro ao listar retiradas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
  }
});

// 3. Detalhar uma retirada específica (com itens) - Acesso Geral
withdrawalRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, name: true, role: true } },
        patient: true,
        items: {
          include: {
            batch: {
              include: { medicine: true },
            },
          },
        },
      },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Retirada não encontrada.' });
    }

    return res.json({
      id: withdrawal.id,
      date: withdrawal.date.toISOString(),
      notes: withdrawal.notes ?? '',
      patient: {
        id: withdrawal.patient.id,
        name: withdrawal.patient.name,
        cpf: withdrawal.patient.cpf ?? '',
      },
      user: {
        id: withdrawal.user.id,
        name: withdrawal.user.name,
        role: withdrawal.user.role,
      },
      items: withdrawal.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        batch: {
          id: item.batch.id,
          batchNumber: item.batch.batchNumber,
          currentQuantity: item.batch.currentQuantity,
          medicine: {
            id: item.batch.medicine.id,
            name: item.batch.medicine.name,
            dosage: item.batch.medicine.dosage ?? '',
          },
        },
      })),
    });
  } catch (error) {
    console.error('Erro ao detalhar retirada:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar retirada.' });
  }
});

// 4. Atualizar retirada - apenas observações (não permite alterar itens/quantidades)
withdrawalRoutes.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const existingWithdrawal = await prisma.withdrawal.findUnique({
      where: { id: Number(id) },
    });

    if (!existingWithdrawal) {
      return res.status(404).json({ error: 'Retirada não encontrada.' });
    }

    if (notes === undefined) {
      return res.status(400).json({ error: 'Campo notes é obrigatório.' });
    }

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: Number(id) },
      data: { notes: String(notes) },
      include: { patient: true },
    });

    return res.json(updatedWithdrawal);
  } catch (error) {
    console.error('Erro ao atualizar retirada:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar retirada.' });
  }
});

// 5. Cancelar retirada - restaura o estoque dos lotes e remove o registro
withdrawalRoutes.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Retirada não encontrada.' });
    }

    await prisma.$transaction(async (tx) => {
      // Restaura a quantidade em cada lote associado
      for (const item of withdrawal.items) {
        await tx.stockBatch.update({
          where: { id: item.batchId },
          data: { currentQuantity: { increment: item.quantity } },
        });
      }
      await tx.withdrawalItem.deleteMany({ where: { withdrawalId: withdrawal.id } });
      await tx.withdrawal.delete({ where: { id: withdrawal.id } });
    });

    return res.json({
      message: 'Retirada cancelada e estoque restaurado com sucesso.',
      restoredItems: withdrawal.items.length,
    });
  } catch (error) {
    console.error('Erro ao cancelar retirada:', error);
    return res.status(500).json({ error: 'Erro interno ao cancelar retirada.' });
  }
});

export { withdrawalRoutes };