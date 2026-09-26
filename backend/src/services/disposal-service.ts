import { DisposalRepository } from '../repositories/disposal-repository';
import { ActivityLogService } from './activity-log-service';

// service de descarte de lote. concentra as regras de negocio sobre
// descartes: registrar, atualizar, excluir e reverter.
// o trabalho pesado (baixar saldo, devolver saldo, transacao) fica
// no repositorio. aqui a gente valida entrada e registra auditoria.
export class DisposalService {
  private disposalRepo: DisposalRepository;
  private logService: ActivityLogService;

  constructor() {
    // repositorio de descarte e service de log de auditoria.
    this.disposalRepo = new DisposalRepository();
    this.logService = new ActivityLogService();
  }

  // lista todos os descartes registrados.
  async getAll() {
    return this.disposalRepo.findAll();
  }

  // busca um descarte pelo id. se nao achar, lanca 404.
  async getById(id: number) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }
    return disposal;
  }

  // registra um novo descarte. valida os campos obrigatorios,
  // delega pro repositorio (que baixa o saldo do lote numa transacao)
  // e grava o log de auditoria.
  async create(userId: number, role: string, data: {
    batchId: number;
    quantity: number;
    reason: string;
    notes?: string;
  }) {
    const { batchId, quantity, reason, notes } = data;

    // lote e quantidade sao obrigatorios.
    if (!batchId) {
      throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
    } else {
      if (!quantity) {
        throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
      }
    }

    // quantidade precisa ser positiva.
    if (quantity <= 0) {
      throw { statusCode: 400, message: 'Quantidade deve ser maior que zero' };
    }

    // chama o repositorio (/repositories/disposal-repository.ts) pra
    // criar o descarte e dar baixa no saldo do lote.
    const disposal = await this.disposalRepo.create({
      batchId,
      userId,
      quantity,
      reason,
      notes,
    });

    // se nao veio observacao, marca como nao informado so pra o log.
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

  // atualiza dados simples do descarte (motivo e/ou observacoes).
  // nao mexe em saldo nem em status.
  async update(userId: number, role: string, id: number, data: { reason?: string; notes?: string }) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }

    // chama o repositorio (/repositories/disposal-repository.ts) pra
    // aplicar as mudancas.
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

  // exclui um descarte. se ele ainda estiver ativo, o repositorio
  // devolve a quantidade ao lote original e registra a movimentacao
  // de reversao antes de apagar (fica tudo dentro da transacao la).
  async delete(userId: number, role: string, id: number) {
    const disposal = await this.disposalRepo.findById(id);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }

    // chama o repositorio (/repositories/disposal-repository.ts) pra excluir.
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

  // reverte um descarte: devolve a quantidade ao lote original,
  // marca o descarte como revertido e registra o log.
  // o motivo e obrigatorio (garantido pelo schema e pelo repositorio).
  async revert(userId: number, role: string, disposalId: number, revertReason: string) {
    const disposal = await this.disposalRepo.findById(disposalId);
    if (!disposal) {
      throw { statusCode: 404, message: 'Descarte não encontrado' };
    }

    // chama o repositorio (/repositories/disposal-repository.ts) pra
    // reverter. la roda tudo em transacao: marca revertido, devolve saldo,
    // registra movimentacao e log de atividade.
    const reverted = await this.disposalRepo.revert(disposalId, userId, revertReason);

    return reverted;
  }
}