import { MedicineRepository } from '../repositories/medicine-repository';
import { ActivityLogService } from './activity-log-service';
import { StockStatusService } from './stock-status-service';
import { prisma } from '../utils/prisma';

// service de medicamento. concentra as regras de negocio do catalogo:
// listar com saldo calculado, buscar por id, criar, atualizar e excluir.
// aqui a gente enriquece o medicamento com informacoes derivadas
// (status de estoque, quantidade fisica, reservada e disponivel)
// usando o stockstatusservice. tambem cuida da formatacao de dosagem
// e do registro de auditoria.
export class MedicineService {
  private medicineRepo: MedicineRepository;
  private logService: ActivityLogService;
  private stockStatusService: StockStatusService;

  constructor() {
    // repositorio de medicamento, log de auditoria e o service
    // que sabe calcular status de estoque por lote e por medicamento.
    this.medicineRepo = new MedicineRepository();
    this.logService = new ActivityLogService();
    this.stockStatusService = new StockStatusService();
  }

  // lista medicamentos com os campos de estoque ja calculados.
  // a estrategia e: 1 query pros medicamentos (com lotes enxutos)
  // + 1 query agregada pro reservado, totalizando 2 consultas,
  // em vez de varrer items e somar em js lote a lote.
  async getAll(role?: string) {
    const medicines = await this.medicineRepo.findAll();

    // monta o mapa de reservas por medicamento. usamos groupby no banco
    // (usa indice [medicineId] em appointmentitem) e, se o client nao
    // suportar (ex: mock em teste), caimos pra findmany + soma em js.
    let reservedMap: Record<number, number> = {};
    try {
      const appointmentItem = (prisma as any).appointmentItem;
      if (appointmentItem && typeof appointmentItem.groupBy === 'function') {
        const grouped = await appointmentItem.groupBy({
          by: ['medicineId'],
          where: {
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          _sum: { quantity: true },
        });
        for (const row of grouped) {
          reservedMap[row.medicineId] = row._sum.quantity ?? 0;
        }
      } else if (appointmentItem && typeof appointmentItem.findMany === 'function') {
        const pendingItems = await appointmentItem.findMany({
          where: {
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          select: { medicineId: true, quantity: true },
        });
        for (const item of pendingItems ?? []) {
          reservedMap[item.medicineId] = (reservedMap[item.medicineId] ?? 0) + item.quantity;
        }
      }
    } catch {
      reservedMap = {};
    }

    // percorre os medicamentos enriquecendo cada um com status dos
    // lotes, totais de quantidade e status geral do estoque.
    const formattedMedicines = [];
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      let batchesList = [];
      if (med.batches) {
        if (Array.isArray(med.batches)) {
          batchesList = med.batches;
        }
      }

      let medMinQuantity = 0;
      if (med.minQuantity !== undefined) {
        if (med.minQuantity !== null) {
          medMinQuantity = med.minQuantity;
        }
      }

      // aqui chamamos o stockstatusservice pra calcular o status geral
      // do medicamento a partir dos lotes e da quantidade minima.
      const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

      // calcula o status de cada lote individualmente pra enriquecer
      // a resposta que vai pro front.
      const formattedBatches = [];
      for (let j = 0; j < batchesList.length; j++) {
        const batch = batchesList[j];
        const batchStatus = this.stockStatusService.calculateBatchStatus(
          batch.currentQuantity,
          batch.expirationDate,
          batch.isBlocked
        );
        formattedBatches.push({
          ...batch,
          status: batchStatus,
        });
      }

      // quantidade reservada vem do mapa montado acima.
      let resQty = 0;
      if (reservedMap[med.id]) {
        resQty = reservedMap[med.id];
      }
      // disponivel real = fisico - reservado, nunca negativo.
      const physicalQty = stockCalc.totalQuantity;
      let availQty = 0;
      if (physicalQty > resQty) {
        availQty = physicalQty - resQty;
      } else {
        availQty = 0;
      }

      if (role === 'PACIENTE') {
        formattedMedicines.push({
          id: med.id,
          name: med.name,
          activeIngredient: med.activeIngredient,
          dosage: med.dosage,
          category: med.category,
          accessibleDesc: med.accessibleDesc,
          status: stockCalc.status,
          available: availQty > 0,
          hasStock: availQty > 0,
        });
      } else {
        formattedMedicines.push({
        ...med,
        batches: formattedBatches,
        totalQuantity: physicalQty,
        physicalQuantity: physicalQty,
        reservedQuantity: resQty,
        availableQuantity: availQty,
        batchesCount: stockCalc.batchesCount,
        status: stockCalc.status,
        });
      }
    }
    return formattedMedicines;
  }

  // busca um medicamento pelo id, tambem enriquecido com status dos
  // lotes, totais e reserva. a reserva vem de um aggregate no banco
  // (soma das quantidades em consultas pending/confirmed).
  async getById(id: number, role?: string) {
    const med = await this.medicineRepo.findById(id);
    if (!med) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    let batchesList = [];
    if (med.batches) {
      if (Array.isArray(med.batches)) {
        batchesList = med.batches;
      }
    }

    let medMinQuantity = 0;
    if (med.minQuantity !== undefined) {
      if (med.minQuantity !== null) {
        medMinQuantity = med.minQuantity;
      }
    }

    const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

    const formattedBatches = [];
    for (let j = 0; j < batchesList.length; j++) {
      const batch = batchesList[j];
      const batchStatus = this.stockStatusService.calculateBatchStatus(
        batch.currentQuantity,
        batch.expirationDate,
        batch.isBlocked
      );
      formattedBatches.push({
        ...batch,
        status: batchStatus,
      });
    }

    // soma do reservado. tentamos aggregate no banco e, se nao rolar,
    // caimos pra findmany + soma em js.
    let resQty = 0;
    try {
      const appointmentItem = (prisma as any).appointmentItem;
      if (appointmentItem && typeof appointmentItem.aggregate === 'function') {
        const agg = await appointmentItem.aggregate({
          where: {
            medicineId: id,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          _sum: { quantity: true },
        });
        resQty = agg._sum.quantity ?? 0;
      } else if (appointmentItem && typeof appointmentItem.findMany === 'function') {
        const pendingItems = await appointmentItem.findMany({
          where: {
            medicineId: id,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          select: { quantity: true },
        });
        for (const item of pendingItems ?? []) {
          resQty += item.quantity;
        }
      }
    } catch {
      resQty = 0;
    }

    // disponivel real = fisico - reservado, nunca negativo.
    const physicalQty = stockCalc.totalQuantity;
    let availQty = 0;
    if (physicalQty > resQty) {
      availQty = physicalQty - resQty;
    } else {
      availQty = 0;
    }

    if (role === 'PACIENTE') {
      return {
        id: med.id,
        name: med.name,
        activeIngredient: med.activeIngredient,
        dosage: med.dosage,
        category: med.category,
        accessibleDesc: med.accessibleDesc,
        status: stockCalc.status,
        available: availQty > 0,
        hasStock: availQty > 0,
      };
    }

    return {
      ...med,
      batches: formattedBatches,
      totalQuantity: physicalQty,
      physicalQuantity: physicalQty,
      reservedQuantity: resQty,
      availableQuantity: availQty,
      batchesCount: stockCalc.batchesCount,
      status: stockCalc.status,
    };
  }

  // cria um medicamento. valida nome e monta a dosagem no formato
  // "valor unidade" quando vieram os campos separados (dosagevalue + dosageunit).
  // no fim, registra o log de auditoria.
  async create(userId: number, role: string, data: {
    name: string;
    activeIngredient?: string;
    dosage?: string;
    dosageValue?: number;
    dosageUnit?: string;
    minQuantity?: number;
    accessibleDesc?: string;
    category?: string;
  }) {
    // nome e obrigatorio e nao pode ser so espaco em branco.
    if (!data.name) {
      throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
    } else {
      if (!data.name.trim()) {
        throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
      }
    }

    // se veio dosagem estruturada (valor + unidade), monta a string.
    let formattedDosage = data.dosage;
    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        if (data.dosageUnit) {
          formattedDosage = data.dosageValue + ' ' + data.dosageUnit;
        }
      }
    }

    // chama o repositorio (/repositories/medicine-repository.ts) pra criar.
    const medicine = await this.medicineRepo.create({
      ...data,
      name: data.name.trim(),
      dosage: formattedDosage,
    });

    await this.logService.log(
      userId,
      'create',
      'medicines',
      medicine.id,
      `Cadastrou medicamento: ${medicine.name}`
    );

    return medicine;
  }

  // atualiza dados do medicamento. valida nome quando veio, aplica a
  // mesma regra de dosagem estruturada e devolve o medicamento ja com
  // os campos de estoque calculados.
  async update(userId: number, role: string, id: number, data: {
    name?: string;
    activeIngredient?: string;
    dosage?: string;
    dosageValue?: number;
    dosageUnit?: string;
    minQuantity?: number;
    accessibleDesc?: string;
    category?: string;
  }) {
    const existing = await this.medicineRepo.findById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    // se o nome veio, nao pode ser vazio.
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw { statusCode: 400, message: 'Nome do medicamento não pode ser vazio' };
      }
    }

    const updateData = { ...data };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    // mesma regra de dosagem do create.
    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        if (data.dosageUnit) {
          updateData.dosage = data.dosageValue + ' ' + data.dosageUnit;
        }
      }
    }

    // chama o repositorio (/repositories/medicine-repository.ts) pra atualizar.
    const updated = await this.medicineRepo.update(id, updateData);

    await this.logService.log(
      userId,
      'update',
      'medicines',
      id,
      `Atualizou medicamento: ${updated.name}`
    );

    // recalcula o status de estoque pra devolver junto com o update.
    let batchesList = [];
    if (updated.batches) {
      if (Array.isArray(updated.batches)) {
        batchesList = updated.batches;
      }
    }

    let medMinQuantity = 0;
    if (updated.minQuantity !== undefined) {
      if (updated.minQuantity !== null) {
        medMinQuantity = updated.minQuantity;
      }
    }

    const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

    return {
      ...updated,
      totalQuantity: stockCalc.totalQuantity,
      batchesCount: stockCalc.batchesCount,
      status: stockCalc.status,
    };
  }

  // exclui um medicamento. e soft delete (deletedAt), pra preservar
  // historico de consultas e movimentacoes. registra auditoria no fim.
  async delete(userId: number, role: string, id: number) {
    const existing = await this.medicineRepo.findById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    // chama o repositorio (/repositories/medicine-repository.ts) pra
    // aplicar o soft delete.
    const deleted = await this.medicineRepo.delete(id);

    await this.logService.log(
      userId,
      'delete',
      'medicines',
      id,
      `Excluiu medicamento: ${existing.name}`
    );

    return deleted;
  }
}