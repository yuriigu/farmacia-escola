import { prisma } from '../utils/prisma';

// repositorio de medicamento. e a camada que fala direto com o prisma
// pra ler e gravar o catalogo de medicamentos. o service usa essa classe
// pra nao precisar conhecer detalhes do banco.
export class MedicineRepository {
  // lista os medicamentos ativos (ignora os que tem deletedAt preenchido).
  // traz junto uma projection enxuta dos lotes, so com os campos que
  // o calculo de status de estoque realmente usa. assim evitamos carregar
  // colunas pesadas (como supplier e blockReason) em toda listagem.
  async findAll() {
    return prisma.medicine.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        batches: {
          select: {
            id: true,
            medicineId: true,
            batchNumber: true,
            currentQuantity: true,
            expirationDate: true,
            isBlocked: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // busca um medicamento pelo id. usa findFirst porque alem do id
  // tambem filtramos por deletedAt, ou seja, sao dois criterios.
  // aqui a projection de lotes e mais completa do que no findAll,
  // porque essa consulta alimenta a tela de detalhe.
  async findById(id: number) {
    return prisma.medicine.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        batches: {
          select: {
            id: true,
            medicineId: true,
            batchNumber: true,
            currentQuantity: true,
            expirationDate: true,
            manufacturingDate: true,
            supplier: true,
            isBlocked: true,
            blockReason: true,
            receivedAt: true,
          },
        },
      },
    });
  }

  // cria um novo medicamento no catalogo.
  async create(data: {
    name: string;
    activeIngredient?: string | null;
    dosage?: string | null;
    dosageValue?: number | null;
    dosageUnit?: string | null;
    minQuantity?: number | null;
    accessibleDesc?: string | null;
    category?: string | null;
  }) {
    return prisma.medicine.create({
      data,
      include: { batches: true },
    });
  }

  // atualiza dados cadastrais do medicamento. aceita tambem o campo
  // deletedAt pra permitir restaurar um medicamento deletado, caso preciso.
  async update(
    id: number,
    data: {
      name?: string;
      activeIngredient?: string | null;
      dosage?: string | null;
      dosageValue?: number | null;
      dosageUnit?: string | null;
      minQuantity?: number | null;
      accessibleDesc?: string | null;
      category?: string | null;
      deletedAt?: Date | null;
    }
  ) {
    return prisma.medicine.update({
      where: { id },
      data,
      include: { batches: true },
    });
  }

  // exclui o medicamento de forma logica (soft delete): em vez de apagar
  // a linha, so marca deletedAt com a data atual. assim preservamos
  // historico de consultas e movimentacoes que apontam pra esse medicamento.
  async delete(id: number) {
    return prisma.medicine.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}