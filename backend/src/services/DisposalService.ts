import { DisposalRepository } from '../repositories/DisposalRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { ActivityLogService } from './ActivityLogService';

export class DisposalService {
  private disposalRepo: DisposalRepository;
  private batchRepo: BatchRepository;
  private logService: ActivityLogService;

  constructor() {
    this.disposalRepo = new DisposalRepository();
    this.batchRepo = new BatchRepository();
    this.logService = new ActivityLogService();
  }

  async getAll() {
    return this.disposalRepo.findAll();
  }

  async getById(id: number) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) throw { statusCode: 404, message: 'Descarte não encontrado' };
    return disposal;
  }

  async create(userId: number, role: string, data: {
    batchId: number;
    quantity: number;
    reason?: string;
  }) {
    const { batchId, quantity, reason } = data;

    if (!batchId || !quantity) {
      throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
    }

    if (quantity <= 0) {
      throw { statusCode: 400, message: 'Quantidade deve ser maior que zero' };
    }

    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    if (batch.currentQuantity < quantity) {
      throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque' };
    }

    const disposal = await this.disposalRepo.create({
      batchId,
      userId,
      quantity,
      reason,
    });

    await this.batchRepo.update(batchId, {
      currentQuantity: batch.currentQuantity - quantity,
    });

    await this.logService.log(
      userId,
      'create',
      'disposals',
      disposal.id,
      `Registrou descarte de ${quantity} un. do lote ${batch.batchNumber}. Motivo: ${reason || 'Não informado'}`
    );

    return disposal;
  }

  async update(userId: number, role: string, id: number, data: { reason?: string }) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) throw { statusCode: 404, message: 'Descarte não encontrado' };

    const updated = await this.disposalRepo.update(id, data);

    await this.logService.log(
      userId,
      'update',
      'disposals',
      id,
      `Atualizou motivo do descarte #${id}`
    );

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) throw { statusCode: 404, message: 'Descarte não encontrado' };

    const batch = await this.batchRepo.findById(disposal.batchId);
    if (batch) {
      await this.batchRepo.update(batch.id, {
        currentQuantity: batch.currentQuantity + disposal.quantity,
      });
    }

    await this.disposalRepo.delete(id);

    await this.logService.log(
      userId,
      'delete',
      'disposals',
      id,
      `Excluiu descarte #${id}`
    );

    return { message: 'Descarte excluído com sucesso' };
  }

  async revert(userId: number, role: string, disposalId: number) {
    const disposal = await this.disposalRepo.findById(disposalId);
    if (!disposal) throw { statusCode: 404, message: 'Descarte não encontrado' };

    const batch = await this.batchRepo.findById(disposal.batchId);
    if (batch) {
      await this.batchRepo.update(batch.id, {
        currentQuantity: batch.currentQuantity + disposal.quantity,
      });
    }

    const reverted = await this.disposalRepo.revert(disposalId);

    await this.logService.log(
      userId,
      'revert',
      'disposals',
      disposalId,
      `Reverteu o descarte #${disposalId}`
    );

    return reverted;
  }
}