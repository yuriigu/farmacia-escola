import { prisma } from '../utils/prisma';

// repositorio de lote de estoque. e a camada que fala direto com o prisma
// pra ler e gravar lotes. o service usa essa classe pra nao conhecer
// detalhes de banco.
export class BatchRepository {
  // projection enxuta do medicamento usada nas listagens.
  // evita trazer o registro inteiro de medicine em cada linha de estoque,
  // o que pesaria bastante quando o lote e incluido em varias consultas.
  private readonly medicineSelect = {
    id: true,
    name: true,
    dosage: true,
    activeIngredient: true,
    category: true,
  } as const;

  // lista lotes. filtra por medicamento quando o id e passado e
  // sempre ignora lotes de medicamentos deletados (soft delete).
  // aceita paginacao opcional com take/skip; sem take, o padrao e 200.
  async findAll(medicineId?: number, pagination?: { take?: number; skip?: number }) {
    // filtro base: nunca trazer lote de medicamento deletado.
    // se veio medicineId, apertamos pra esse medicamento.
    let where: any = {
      medicine: {
        deletedAt: null,
      },
    };
    if (medicineId) {
      where = {
        medicineId: medicineId,
        medicine: {
          deletedAt: null,
        },
      };
    }
    return prisma.stockBatch.findMany({
      where: where,
      include: { medicine: { select: this.medicineSelect } },
      orderBy: { expirationDate: 'asc' },
      take: pagination?.take ?? 200,
      // skip so entra na query se foi passado, mantendo o default limpo.
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  // busca um lote por id. usa findFirst porque junto com o id
  // vai a condicao de medicamento nao deletado, ou seja, filtra em mais
  // de um criterio (id sozinho nao bastaria com findUnique).
  async findById(id: number) {
    return prisma.stockBatch.findFirst({
      where: {
        id: id,
        medicine: {
          deletedAt: null,
        },
      },
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // busca um lote pelo par (medicamento, numero do lote), que e
  // a chave unica la no schema. serve pra checar duplicidade antes
  // de tentar criar.
  async findByMedicineAndBatchNumber(medicineId: number, batchNumber: string) {
    return prisma.stockBatch.findFirst({
      where: {
        medicineId: medicineId,
        batchNumber: batchNumber,
      },
    });
  }

  async findMergeCandidate(
    medicineId: number,
    batchNumber: string,
    expirationDate: Date,
    supplier: string
  ) {
    const dayStart = new Date(expirationDate);
    dayStart.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const normalizedSupplier = supplier.trim().toLowerCase();

    const candidates = await prisma.stockBatch.findMany({
      where: {
        medicineId,
        batchNumber: batchNumber.trim(),
        expirationDate: { gte: dayStart, lt: nextDay },
      },
    });

    return candidates.find((batch) => batch.supplier.trim().toLowerCase() === normalizedSupplier) ?? null;
  }

  // cria um novo lote no banco.
  async create(data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    initialQuantity: number;
    expirationDate: Date;
    manufacturingDate?: Date | null;
    supplier: string;
    isBlocked?: boolean;
    blockReason?: string | null;
  }) {
    return prisma.stockBatch.create({
      data,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // ajusta a quantidade do lote de forma relativa (delta pode ser
  // positivo ou negativo). e o que as entradas e saidas de estoque
  // usam pra nao sobrescrever o saldo atual.
  async updateQuantity(id: number, delta: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: { increment: delta } },
    });
  }

  async incrementQuantities(id: number, qty: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: {
        currentQuantity: { increment: qty },
        initialQuantity: { increment: qty },
      },
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // define a quantidade absoluta do lote. usado no ajuste auditado,
  // onde o operador informa o saldo final corrigido.
  async setQuantity(id: number, newQuantity: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: newQuantity },
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // altera o estado de bloqueio sanitario do lote.
  // a regra e: se esta bloqueando e veio um motivo, guarda o motivo;
  // se esta bloqueando sem motivo ou desbloqueando, limpa o campo.
  async setBlockStatus(id: number, isBlocked: boolean, blockReason?: string | null) {
    let reasonValue: string | null = null;
    if (isBlocked) {
      if (blockReason) {
        reasonValue = blockReason;
      } else {
        reasonValue = null;
      }
    } else {
      reasonValue = null;
    }

    return prisma.stockBatch.update({
      where: { id },
      data: {
        isBlocked: isBlocked,
        blockReason: reasonValue,
      } as any,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // atualiza os dados cadastrais do lote (numero, validade, fornecedor, etc).
  // de proposito nao mexe em quantidade, porque saldo so muda pelos
  // metodos updateQuantity / setQuantity.
  async update(
    id: number,
    data: {
      batchNumber?: string;
      expirationDate?: Date;
      manufacturingDate?: Date | null;
      supplier?: string;
    }
  ) {
    return prisma.stockBatch.update({
      where: { id },
      data,
      include: { medicine: { select: this.medicineSelect } },
    });
  }

  // apaga o lote de vez. quem chama e responsavel por garantir que
  // nao ha movimentacoes ou descartes amarrados a ele, ou por tratar
  // o erro de constraint caso haja.
  async delete(id: number) {
    return prisma.stockBatch.delete({ where: { id } });
  }
}