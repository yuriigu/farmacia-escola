import { DisposalRepository } from '../repositories/DisposalRepository';
import { ActivityLogService } from './ActivityLogService';

export class DisposalService {
  private disposalRepo: DisposalRepository;
  private logService: ActivityLogService;

  constructor() {
    this.disposalRepo = new DisposalRepository();
    this.logService = new ActivityLogService();
  }

  async getAll() {
    return this.disposalRepo.findAll();
  }

  async getById(id: number) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }
    return disposal;
  }

  async create(userId: number, role: string, data: {
    batchId: number;
    quantity: number;
    reason: string;
    notes?: string;
  }) {
    const { batchId, quantity, reason, notes } = data;

    if (!batchId) {
      throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
    } else {
      if (!quantity) {
        throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
      }
    }

    if (quantity <= 0) {
      throw { statusCode: 400, message: 'Quantidade deve ser maior que zero' };
    }

    const disposal = await this.disposalRepo.create({
      batchId,
      userId,
      quantity,
      reason,
      notes,
    });

    let notesText = 'Não informado';
    if (notes) {
      notesText = notes;
    }

    await this.logService.log(
      userId,
      'create',
      'disposals',
      disposal.id,
      `Registrou descarte de ${quantity} un. no lote ${disposal.batch.batchNumber}. Motivo: ${reason}. Detalhes: ${notesText}`
    );

    return disposal;
  }

  async update(userId: number, role: string, id: number, data: { reason?: string; notes?: string }) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }

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
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
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

  async revert(userId: number, role: string, disposalId: number, revertReason: string) {
    const disposal = await this.disposalRepo.findById(disposalId);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }

    const reverted = await this.disposalRepo.revert(disposalId, userId, revertReason);

    return reverted;
  }
}
