import { StockStatus } from '../types/enums';

// formato minimo de lote usado pelos calculos desse service.
// serve pra qualquer origem de dados (banco, mock, dto) que tenha
// pelo menos esses campos.
export interface BatchItem {
  id?: number;
  currentQuantity: number;
  expirationDate: string | Date;
  isBlocked?: boolean;
}

// service responsavel por calcular status de estoque.
// tem duas camadas de analise: por lote (individual) e por medicamento
// (agregando os lotes). o medicamento tambem ganha um resumo com
// quantidade total valida e contagem de lotes.
// e o coracao das regras de faixa de validade (30 dias pra critico),
// bloqueio sanitario e quantidade minima.
export class StockStatusService {
  // calcula o status de um lote individual.
  // a ordem das checagens importa:
  // 1) bloqueado tem prioridade, porque o lote sai de circulacao
  //    independente da validade ou do saldo.
  // 2) vencido (data ja passou)
  // 3) sem saldo (quantidade zero)
  // 4) vence em ate 30 dias -> critico
  // 5) caso contrario, em estoque
  calculateBatchStatus(currentQuantity: number, expirationDate: string | Date, isBlocked?: boolean): StockStatus {
    if (isBlocked) {
      return StockStatus.BLOCKED;
    }

    const now = new Date();
    const nowTime = now.getTime();
    const expDate = new Date(expirationDate);
    const expTime = expDate.getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    if (expTime < nowTime) {
      return StockStatus.EXPIRED;
    } else {
      if (currentQuantity <= 0) {
        return StockStatus.OUT_OF_STOCK;
      } else {
        const timeDifference = expTime - nowTime;
        if (timeDifference <= thirtyDaysInMs) {
          return StockStatus.CRITICAL_EXPIRATION;
        } else {
          return StockStatus.IN_STOCK;
        }
      }
    }
  }

  // calcula o status do medicamento a partir dos lotes dele.
  // regras:
  // - sem lote, ou todos vencidos/bloqueados -> expired ou out_of_stock
  // - soma so o que e valido (nao bloqueado, nao vencido, com saldo)
  // - se o saldo valido for menor que a quantidade minima, low_stock
  // - se algum lote valido vence em ate 30 dias, critical_expiration
  // - caso contrario, in_stock
  // a ordem entre low_stock e critical_expiration e proposital:
  // baixo estoque tem prioridade sobre vencimento proximo.
  calculateMedicineStatus(batches: BatchItem[], minQuantity?: number): StockStatus {
    // sem lotes, ja sabemos que nao tem estoque.
    if (!batches) {
      return StockStatus.OUT_OF_STOCK;
    } else {
      if (batches.length === 0) {
        return StockStatus.OUT_OF_STOCK;
      }
    }

    const now = new Date();
    const nowTime = now.getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    // acumuladores usados durante a varredura dos lotes.
    let totalActiveQuantity = 0;
    // comeca true e vira false na primeira prova de lote valido.
    let allBatchesExpired = true;
    let hasCriticalExpiration = false;

    let index = 0;
    while (index < batches.length) {
      const batch = batches[index];
      const expDate = new Date(batch.expirationDate);
      const expTime = expDate.getTime();

      // considera so lotes nao bloqueados e ainda dentro da validade.
      if (!batch.isBlocked) {
        if (expTime >= nowTime) {
          allBatchesExpired = false;
          if (batch.currentQuantity > 0) {
            totalActiveQuantity = totalActiveQuantity + batch.currentQuantity;
            // marca critico se esse lote vence em ate 30 dias.
            const timeDifference = expTime - nowTime;
            if (timeDifference <= thirtyDaysInMs) {
              hasCriticalExpiration = true;
            }
          }
        }
      }
      index = index + 1;
    }

    if (allBatchesExpired) {
      return StockStatus.EXPIRED;
    } else {
      if (totalActiveQuantity <= 0) {
        return StockStatus.OUT_OF_STOCK;
      } else {
        // checa a quantidade minima, se o medicamento tiver uma definida.
        let isLowStock = false;
        if (minQuantity !== undefined) {
          if (minQuantity > 0) {
            if (totalActiveQuantity < minQuantity) {
              isLowStock = true;
            }
          }
        }
        if (isLowStock) {
          return StockStatus.LOW_STOCK;
        } else {
          if (hasCriticalExpiration) {
            return StockStatus.CRITICAL_EXPIRATION;
          } else {
            return StockStatus.IN_STOCK;
          }
        }
      }
    }
  }

  // gera um resumo do estoque do medicamento: quantidade total valida
  // (so lotes nao bloqueados, nao vencidos e com saldo), quantidade
  // de lotes (contando todos, inclusive os invalidos) e status geral.
  // o status geral reaproveita o calculo do calculatemedicinestatus.
  calculateMedicineStock(batches: BatchItem[], minQuantity?: number): {
    totalQuantity: number;
    batchesCount: number;
    status: StockStatus;
  } {
    // sem lotes, resumo zerado.
    if (!batches) {
      return {
        totalQuantity: 0,
        batchesCount: 0,
        status: StockStatus.OUT_OF_STOCK,
      };
    } else {
      if (batches.length === 0) {
        return {
          totalQuantity: 0,
          batchesCount: 0,
          status: StockStatus.OUT_OF_STOCK,
        };
      }
    }

    const now = new Date();
    const nowTime = now.getTime();
    let totalValidQuantity = 0;

    // soma so o que e de fato aproveitavel: nao bloqueado,
    // ainda dentro da validade e com saldo positivo.
    let index = 0;
    while (index < batches.length) {
      const batch = batches[index];
      const expDate = new Date(batch.expirationDate);
      const expTime = expDate.getTime();

      if (!batch.isBlocked) {
        if (expTime >= nowTime) {
          if (batch.currentQuantity > 0) {
            totalValidQuantity = totalValidQuantity + batch.currentQuantity;
          }
        }
      }
      index = index + 1;
    }

    // reaproveita o calculo de status pra nao duplicar regra.
    const status = this.calculateMedicineStatus(batches, minQuantity);

    return {
      totalQuantity: totalValidQuantity,
      batchesCount: batches.length,
      status: status,
    };
  }
}