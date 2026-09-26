import { prisma } from '../utils/prisma';

// repositorio de descarte. e a camada que fala direto com o prisma
// pra ler e gravar descartes de lote. o service usa essa classe pra
// nao precisar conhecer detalhes de banco nem de transacao.
export class DisposalRepository {
  // lista todos os descartes, do mais recente pro mais antigo.
  // depois da consulta, a gente normaliza a resposta pra que o front
  // nao precise saber dos nomes internos do banco: expoe `createdAt`
  // (que no banco e `date`) e apelida campos do lote (code, expiresAt).
  async findAll() {
    const disposals = await prisma.disposal.findMany({
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    return disposals.map((disposal) => ({
      ...disposal,
      createdAt: disposal.date,
      batch: {
        ...disposal.batch,
        code: disposal.batch.batchNumber,
        expiresAt: disposal.batch.expirationDate,
      },
    }));
  }

  // busca um descarte pelo id. faz a mesma normalizacao do findAll
  // (createdAt, code, expiresAt). se nao achar, devolve null e quem
  // chamou decide se vira 404 ou outra coisa.
  async findById(id: number) {
    const disposal = await prisma.disposal.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
      },
    });
    if (!disposal) {
      return null;
    }
    return {
      ...disposal,
      createdAt: disposal.date,
      batch: {
        ...disposal.batch,
        code: disposal.batch.batchNumber,
        expiresAt: disposal.batch.expirationDate,
      },
    };
  }

  // registra um novo descarte. e um fluxo sensivel porque mexe no saldo
  // do lote, entao roda tudo dentro de uma transacao:
  // - confere que o lote existe e tem saldo suficiente
  // - debita do lote com updateMany condicional (protege contra corrida)
  // - cria o registro de descarte
  // - grava a movimentacao de estoque com a quantidade negativa
  // assim, ou tudo acontece, ou nada acontece.
  async create(data: {
    batchId: number;
    userId: number;
    quantity: number;
    reason: string;
    notes?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: data.batchId },
      });

      if (!batch) {
        throw { statusCode: 404, message: 'Lote não encontrado' };
      }

      // checagem rapida antes de tentar debitar. o updateMany abaixo
      // tambem valida, pra cobrir concorrencia.
      if (batch.currentQuantity < data.quantity) {
        throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque' };
      }

      // debito condicional: so decrementa se o saldo ainda for suficiente.
      // evita que duas requisicoes simultaneas estourem o estoque.
      const updateResult = await tx.stockBatch.updateMany({
        where: {
          id: data.batchId,
          currentQuantity: {
            gte: data.quantity,
          },
        },
        data: {
          currentQuantity: {
            decrement: data.quantity,
          },
        },
      });

      if (updateResult.count === 0) {
        throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque devido à concorrência' };
      }

      // cria o registro principal do descarte, ja com status DISPOSED.
      const disposal = await tx.disposal.create({
        data: {
          batchId: data.batchId,
          userId: data.userId,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.notes,
          status: 'DISPOSED',
        },
        include: {
          user: { select: { name: true } },
          batch: {
            include: {
              medicine: { select: { id: true, name: true, dosage: true } },
            },
          },
        },
      });

      // grava o movimento de estoque. usamos quantidade negativa
      // pra indicar saida, e a nota amarra esse movimento ao id do descarte.
      await tx.stockMovement.create({
        data: {
          batchId: data.batchId,
          type: 'DISPOSAL',
          quantity: -data.quantity,
          notes: 'Descarte de material #' + disposal.id + '. Motivo: ' + data.reason,
          userId: data.userId,
        },
      });

      return disposal;
    });
  }

  // reverte um descarte: devolve a quantidade ao lote original,
  // marca o descarte como REVERTED e grava o rastro (movimentacao
  // de estoque e log de atividade).
  // tudo numa transacao pra nao ficar estado pela metade.
  async revert(id: number, userId: number, revertReason: string) {
    return prisma.$transaction(async (tx) => {
      const disposal = await tx.disposal.findUnique({ where: { id } });
      if (!disposal) {
        throw { statusCode: 404, message: 'Descarte não encontrado' };
      }
      // trava basica: nao deixa reverter duas vezes o mesmo descarte.
      if (disposal.status === 'REVERTED') {
        throw { statusCode: 400, message: 'O descarte já foi revertido' };
      }

      // updateMany condicional: so marca REVERTED se ainda estiver DISPOSED.
      // protege contra duas reversoes simultaneas.
      const updateDisposalResult = await tx.disposal.updateMany({
        where: {
          id: id,
          status: 'DISPOSED',
        },
        data: {
          status: 'REVERTED',
          revertReason,
        },
      });

      if (updateDisposalResult.count === 0) {
        throw new Error('Descarte não encontrado ou já revertido');
      }

      const updated = await tx.disposal.findUnique({
        where: { id },
        include: {
          user: { select: { name: true } },
          batch: {
            include: {
              medicine: { select: { id: true, name: true, dosage: true } },
            },
          },
        },
      });

      // devolve a quantidade ao lote original.
      await tx.stockBatch.update({
        where: { id: disposal.batchId },
        data: { currentQuantity: { increment: disposal.quantity } },
      });

      // registra o movimento de entrada referente a reversao.
      await tx.stockMovement.create({
        data: {
          batchId: disposal.batchId,
          type: 'REVERT',
          quantity: disposal.quantity,
          notes: 'Reversão do descarte #' + id + '. Motivo: ' + revertReason,
          userId: userId,
        },
      });

      // log de auditoria. aqui fica a trilha de quem reverteu e por que,
      // alem dos dados que ficam no proprio descarte.
      await tx.activityLog.create({
        data: {
          userId,
          action: 'revert',
          entity: 'disposals',
          entityId: id,
          details: `Reverteu o descarte #${id}. Motivo: ${revertReason}`,
        },
      });

      if (!updated) {
        throw { statusCode: 404, message: 'Descarte não encontrado' };
      }
      // mesma normalizacao dos outros metodos de leitura.
      return {
        ...updated,
        createdAt: updated.date,
        batch: {
          ...updated.batch,
          code: updated.batch.batchNumber,
          expiresAt: updated.batch.expirationDate,
        },
      };
    });
  }

  // atualiza campos simples do descarte (motivo e/ou observacoes).
  // nao mexe em quantidade nem status, pra nao baguncar o estoque.
  async update(id: number, data: { reason?: string; notes?: string }) {
    return prisma.disposal.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
      },
    });
  }

  // apaga um descarte. se ele ainda estava ativo (DISPOSED), a exclusao
  // precisa devolver a quantidade ao lote e registrar o movimento de
  // reversao, pra nao deixar o estoque furado. tudo numa transacao.
  // se ja estava REVERTED, so apaga o registro.
  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      const disposal = await tx.disposal.findUnique({ where: { id } });
      if (!disposal) {
        throw new Error('Descarte não encontrado');
      }

      if (disposal.status === 'DISPOSED') {
        // devolve o saldo ao lote original.
        await tx.stockBatch.update({
          where: { id: disposal.batchId },
          data: { currentQuantity: { increment: disposal.quantity } },
        });

        // registra o movimento de reversao. userId fica null porque
        // a exclusao pode nao ter um usuario associado direto (ex: rotina).
        await tx.stockMovement.create({
          data: {
            batchId: disposal.batchId,
            type: 'REVERT',
            quantity: disposal.quantity,
            notes: 'Exclusão do descarte #' + id,
            userId: null,
          },
        });
      }

      return tx.disposal.delete({ where: { id } });
    });
  }
}