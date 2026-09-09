import { StockStatus } from '../types/Enums';

export interface BatchItem {
  id?: number;
  currentQuantity: number;
  expirationDate: string | Date;
}

export class StockStatusService {
  calculateBatchStatus(currentQuantity: number, expirationDate: string | Date): StockStatus {
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

  calculateMedicineStatus(batches: BatchItem[]): StockStatus {
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

    let totalActiveQuantity = 0;
    let allBatchesExpired = true;
    let hasCriticalExpiration = false;

    let index = 0;
    while (index < batches.length) {
      const batch = batches[index];
      const expDate = new Date(batch.expirationDate);
      const expTime = expDate.getTime();

      if (expTime >= nowTime) {
        allBatchesExpired = false;
        if (batch.currentQuantity > 0) {
          totalActiveQuantity = totalActiveQuantity + batch.currentQuantity;
          const timeDifference = expTime - nowTime;
          if (timeDifference <= thirtyDaysInMs) {
            hasCriticalExpiration = true;
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
        if (hasCriticalExpiration) {
          return StockStatus.CRITICAL_EXPIRATION;
        } else {
          return StockStatus.IN_STOCK;
        }
      }
    }
  }

  calculateMedicineStock(batches: BatchItem[]): {
    totalQuantity: number;
    batchesCount: number;
    status: StockStatus;
  } {
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

    let index = 0;
    while (index < batches.length) {
      const batch = batches[index];
      const expDate = new Date(batch.expirationDate);
      const expTime = expDate.getTime();

      if (expTime >= nowTime) {
        if (batch.currentQuantity > 0) {
          totalValidQuantity = totalValidQuantity + batch.currentQuantity;
        }
      }
      index = index + 1;
    }

    const status = this.calculateMedicineStatus(batches);

    return {
      totalQuantity: totalValidQuantity,
      batchesCount: batches.length,
      status: status,
    };
  }
}
