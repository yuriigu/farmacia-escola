import { BatchRepository } from '../repositories/batch-repository';
import { MedicineRepository } from '../repositories/medicine-repository';
import { ActivityLogService } from './activity-log-service';
import { StockStatusService } from './stock-status-service';
import { StockMovementType } from '../types/enums';
import { prisma } from '../utils/prisma';

// service de lote de estoque. concentra as regras de negocio sobre
// lotes: criar com entrada inicial, atualizar dados cadastrais,
// ajustar saldo (com rastro de auditoria), bloquear/desbloquear
// por questao sanitaria e excluir.
// toda acao que mexe em quantidade ou em estado critico passa pelo
// historico de movimentacoes e pelo log de auditoria.
export class BatchService {
  private batchRepo: BatchRepository;
  private medicineRepo: MedicineRepository;
  private logService: ActivityLogService;
  private stockStatusService: StockStatusService;

  constructor() {
    // repositorios e services de apoio. o stockstatusservice fica
    // disponivel caso o service precise de calculo de status
    // de estoque em algum momento.
    this.batchRepo = new BatchRepository();
    this.medicineRepo = new MedicineRepository();
    this.logService = new ActivityLogService();
    this.stockStatusService = new StockStatusService();
  }

  // lista lotes, com filtro opcional por medicamento.
  async getAll(medicineId?: number) {
    return this.batchRepo.findAll(medicineId);
  }

  // busca um lote pelo id. se nao achar, lanca 404.
  async getById(id: number) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }
    return batch;
  }

  private async mergeBatch(userId: number, existingBatch: { id: number; batchNumber: string }, qty: number) {
    const batch = await this.batchRepo.incrementQuantities(existingBatch.id, qty);

    if (qty > 0) {
      try {
        await prisma.stockMovement.create({
          data: {
            batchId: existingBatch.id,
            type: StockMovementType.ENTRY,
            quantity: qty,
            notes: 'Entrada agregada ao lote: ' + existingBatch.batchNumber,
            userId,
          },
        });
      } catch {
        // O movimento nao deve desfazer a agregacao ja aplicada.
      }
    }

    await this.logService.log(
      userId,
      'aggregate',
      'batches',
      existingBatch.id,
      `Agregou ${qty} unidades ao lote ${existingBatch.batchNumber}`
    );

    return batch;
  }

  // cria um novo lote. valida todos os campos, confere se o medicamento
  // existe e se ja nao ha lote com o mesmo numero pra esse medicamento.
  // se veio quantidade inicial, registra a movimentacao de entrada
  // e, no fim, grava o log de auditoria.
  async create(userId: number, role: string, data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: string | Date;
    manufacturingDate?: string | Date | null;
    supplier: string;
    isBlocked?: boolean;
    blockReason?: string | null;
  }) {
    const { medicineId, batchNumber, currentQuantity, expirationDate, supplier } = data;

    // checagem em cascata dos obrigatorios. mensagem unica porque o
    // cliente costuma mostrar tudo junto mesmo.
    if (!medicineId) {
      throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
    } else {
      if (!batchNumber) {
        throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
      } else {
        if (currentQuantity === undefined) {
          throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
        } else {
          if (!expirationDate) {
            throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
          } else {
            if (!supplier) {
              throw { statusCode: 400, message: 'Fornecedor/origem é obrigatório' };
            }
          }
        }
      }
    }

    // fornecedor nao pode ser so espaco em branco.
    if (!supplier.trim()) {
      throw { statusCode: 400, message: 'Fornecedor/origem é obrigatório' };
    }

    // valida a quantidade inicial: precisa ser numero e >= 0.
    const qty = Number(currentQuantity);
    if (isNaN(qty)) {
      throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
    } else {
      if (qty < 0) {
        throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
      }
    }

    // validade e obrigatoria e precisa parsear.
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) {
      throw { statusCode: 400, message: 'Data de validade inválida' };
    }

    // fabricacao e opcional, mas se veio precisa parsear.
    let mfgDate: Date | null = null;
    if (data.manufacturingDate) {
      const parsedMfg = new Date(data.manufacturingDate);
      if (isNaN(parsedMfg.getTime())) {
        throw { statusCode: 400, message: 'Data de fabricação inválida' };
      }
      mfgDate = parsedMfg;
    } else {
      mfgDate = null;
    }

    // confere se o medicamento existe (nao deletado).
    const medicine = await this.medicineRepo.findById(medicineId);
    if (!medicine) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    const normalizedBatchNumber = batchNumber.trim();
    const normalizedSupplier = supplier.trim();
    const expirationDay = new Date(expDate);
    expirationDay.setHours(0, 0, 0, 0);
    const existingBatch = await this.batchRepo.findMergeCandidate(
      medicineId,
      normalizedBatchNumber,
      expirationDay,
      normalizedSupplier
    );
    if (existingBatch) {
      return this.mergeBatch(userId, existingBatch, qty);
    }

    // normaliza os campos de bloqueio inicial.
    let isBlockedValue = false;
    if (data.isBlocked) {
      isBlockedValue = true;
    } else {
      isBlockedValue = false;
    }

    let blockReasonValue: string | null = null;
    if (data.blockReason) {
      blockReasonValue = data.blockReason;
    } else {
      blockReasonValue = null;
    }

    // cria o lote. se estourar erro de unicidade, tambem devolvemos
    // 409 (protege contra corrida entre a checagem acima e o insert).
    let batch = null;
    try {
      batch = await this.batchRepo.create({
        medicineId,
        batchNumber: normalizedBatchNumber,
        currentQuantity: qty,
        initialQuantity: qty,
        expirationDate: expirationDay,
        manufacturingDate: mfgDate,
        supplier: normalizedSupplier,
        isBlocked: isBlockedValue,
        blockReason: blockReasonValue,
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const racedBatch = await this.batchRepo.findMergeCandidate(
          medicineId,
          normalizedBatchNumber,
          expirationDay,
          normalizedSupplier
        );
        if (racedBatch) {
          return this.mergeBatch(userId, racedBatch, qty);
        }
      }
      throw err;
    }

    // registra a movimentacao de entrada quando veio saldo inicial.
    // se falhar, seguimos em frente pra nao derrubar o cadastro.
    if (qty > 0) {
      try {
        await prisma.stockMovement.create({
          data: {
            batchId: batch.id,
            type: StockMovementType.ENTRY,
            quantity: qty,
            notes: 'Entrada inicial de lote: ' + batch.batchNumber,
            userId: userId,
          },
        });
      } catch {
        // se o historico falhar, ignora: o cadastro em si ja deu certo.
      }
    }

    await this.logService.log(
      userId,
      'create',
      'batches',
      batch.id,
      `Cadastrou lote ${batch.batchNumber} com quantidade ${batch.currentQuantity} e fornecedor ${(batch as any).supplier}`
    );

    return batch;
  }

  // atualiza dados cadastrais do lote (numero, validade, fornecedor, etc).
  // de proposito nao mexe em quantidade, porque saldo so muda pelo
  // endpoint auditado de ajuste (adjustStock).
  async update(userId: number, role: string, id: number, data: {
    batchNumber?: string;
    expirationDate?: string | Date;
    manufacturingDate?: string | Date | null;
    supplier?: string;
  }) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    // monta o update so com os campos que vieram.
    const updateData: any = {};

    if (data.batchNumber !== undefined) {
      updateData.batchNumber = data.batchNumber;
    }

    if (data.supplier !== undefined) {
      updateData.supplier = data.supplier;
    }

    if (data.manufacturingDate !== undefined) {
      // fabricacao aceita null pra limpar o campo.
      if (data.manufacturingDate) {
        const mfg = new Date(data.manufacturingDate);
        if (isNaN(mfg.getTime())) {
          throw { statusCode: 400, message: 'Data de fabricação inválida' };
        }
        updateData.manufacturingDate = mfg;
      } else {
        updateData.manufacturingDate = null;
      }
    }

    if (data.expirationDate) {
      const expDate = new Date(data.expirationDate);
      if (isNaN(expDate.getTime())) {
        throw { statusCode: 400, message: 'Data de validade inválida' };
      }
      updateData.expirationDate = expDate;
    }

    // chama o repositorio (/repositories/batch-repository.ts) pra persistir.
    const updated = await this.batchRepo.update(id, updateData);

    await this.logService.log(
      userId,
      'update',
      'batches',
      id,
      `Atualizou lote ${updated.batchNumber}`
    );

    return updated;
  }

  // ajuste auditado de saldo. e a unica forma de corrigir a quantidade
  // de um lote diretamente, porque exige justificativa e gera movimentacao
  // do tipo adjustment (com o delta) e log de auditoria.
  async adjustStock(userId: number, role: string, id: number, data: {
    newQuantity: number;
    reason: string;
  }) {
    const { newQuantity, reason } = data;

    if (newQuantity === undefined) {
      throw { statusCode: 400, message: 'Nova quantidade é obrigatória' };
    } else {
      if (newQuantity === null) {
        throw { statusCode: 400, message: 'Nova quantidade é obrigatória' };
      }
    }

    // quantidade precisa ser numero >= 0.
    const qty = Number(newQuantity);
    if (isNaN(qty)) {
      throw { statusCode: 400, message: 'A quantidade deve ser um número válido' };
    } else {
      if (qty < 0) {
        throw { statusCode: 400, message: 'A quantidade não pode ser negativa' };
      }
    }

    // justificativa obrigatoria, porque sem rastro o ajuste nao vale.
    if (!reason) {
      throw { statusCode: 400, message: 'A justificativa do ajuste é obrigatória' };
    } else {
      if (!reason.trim()) {
        throw { statusCode: 400, message: 'A justificativa do ajuste é obrigatória' };
      }
    }

    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    // guarda o saldo anterior pra calcular o delta e registrar no historico.
    const previousQuantity = batch.currentQuantity;
    const delta = qty - previousQuantity;
    const updated = await this.batchRepo.setQuantity(id, qty);

    // movimentacao de ajuste. se falhar, so ignora (o ajuste em si
    // ja foi feito, mas o ideal seria alertar).
    try {
      await prisma.stockMovement.create({
        data: {
          batchId: id,
          type: StockMovementType.ADJUSTMENT,
          quantity: delta,
          notes: 'Ajuste de saldo do lote ' + batch.batchNumber + ': de ' + previousQuantity + ' para ' + qty + ' un. Justificativa: ' + reason.trim(),
          userId: userId,
        },
      });
    } catch {
      // se o historico falhar, ignora: o ajuste em si ja foi aplicado.
    }

    await this.logService.log(
      userId,
      'adjustment',
      'batches',
      id,
      `Ajuste de saldo do lote ${batch.batchNumber}: de ${previousQuantity} para ${qty} un. Justificativa: ${reason.trim()}`
    );

    return updated;
  }

  // aplica ou retira o bloqueio sanitario do lote.
  // quando esta bloqueando, o motivo e obrigatorio. quando desbloqueia,
  // o motivo e limpo.
  async setBlockStatus(userId: number, role: string, id: number, data: {
    isBlocked: boolean;
    blockReason?: string | null;
  }) {
    const { isBlocked, blockReason } = data;

    if (isBlocked === undefined) {
      throw { statusCode: 400, message: 'O status de bloqueio é obrigatório' };
    } else {
      if (isBlocked === null) {
        throw { statusCode: 400, message: 'O status de bloqueio é obrigatório' };
      }
    }

    // bloqueio exige motivo. desbloqueio nao.
    if (isBlocked) {
      if (!blockReason) {
        throw { statusCode: 400, message: 'O motivo do bloqueio sanitário é obrigatório' };
      } else {
        if (!blockReason.trim()) {
          throw { statusCode: 400, message: 'O motivo do bloqueio sanitário é obrigatório' };
        }
      }
    }

    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    // normaliza o motivo: guardado so quando bloqueia; caso contrario, null.
    let finalReason: string | null = null;
    if (isBlocked) {
      if (blockReason) {
        finalReason = blockReason.trim();
      } else {
        finalReason = null;
      }
    } else {
      finalReason = null;
    }

    // chama o repositorio (/repositories/batch-repository.ts) pra aplicar.
    const updated = await this.batchRepo.setBlockStatus(id, isBlocked, finalReason);

    // monta o texto do log de acordo com a acao (block ou unblock).
    let actionText = '';
    let actionType = 'block';
    if (isBlocked) {
      actionType = 'block';
      actionText = `Bloqueio sanitário aplicado ao lote ${batch.batchNumber}. Motivo: ${finalReason}`;
    } else {
      actionType = 'unblock';
      actionText = `Desbloqueio sanitário realizado no lote ${batch.batchNumber}.`;
    }

    await this.logService.log(
      userId,
      actionType,
      'batches',
      id,
      actionText
    );

    return updated;
  }

  // exclui um lote. se houver movimentacoes ou descartes ligados a ele,
  // o banco vai bloquear pela fk, e o erro sobe pro middleware global.
  async delete(userId: number, role: string, id: number) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    await this.batchRepo.delete(id);

    await this.logService.log(
      userId,
      'delete',
      'batches',
      id,
      `Excluiu lote ${batch.batchNumber}`
    );

    return { message: 'Lote excluído com sucesso' };
  }
}