"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockStatusService = void 0;
const Enums_1 = require("../types/Enums");
class StockStatusService {
    calculateBatchStatus(currentQuantity, expirationDate, isBlocked) {
        if (isBlocked) {
            return Enums_1.StockStatus.BLOCKED;
        }
        const now = new Date();
        const nowTime = now.getTime();
        const expDate = new Date(expirationDate);
        const expTime = expDate.getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (expTime < nowTime) {
            return Enums_1.StockStatus.EXPIRED;
        }
        else {
            if (currentQuantity <= 0) {
                return Enums_1.StockStatus.OUT_OF_STOCK;
            }
            else {
                const timeDifference = expTime - nowTime;
                if (timeDifference <= thirtyDaysInMs) {
                    return Enums_1.StockStatus.CRITICAL_EXPIRATION;
                }
                else {
                    return Enums_1.StockStatus.IN_STOCK;
                }
            }
        }
    }
    calculateMedicineStatus(batches) {
        if (!batches) {
            return Enums_1.StockStatus.OUT_OF_STOCK;
        }
        else {
            if (batches.length === 0) {
                return Enums_1.StockStatus.OUT_OF_STOCK;
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
            if (!batch.isBlocked) {
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
            }
            index = index + 1;
        }
        if (allBatchesExpired) {
            return Enums_1.StockStatus.EXPIRED;
        }
        else {
            if (totalActiveQuantity <= 0) {
                return Enums_1.StockStatus.OUT_OF_STOCK;
            }
            else {
                if (hasCriticalExpiration) {
                    return Enums_1.StockStatus.CRITICAL_EXPIRATION;
                }
                else {
                    return Enums_1.StockStatus.IN_STOCK;
                }
            }
        }
    }
    calculateMedicineStock(batches) {
        if (!batches) {
            return {
                totalQuantity: 0,
                batchesCount: 0,
                status: Enums_1.StockStatus.OUT_OF_STOCK,
            };
        }
        else {
            if (batches.length === 0) {
                return {
                    totalQuantity: 0,
                    batchesCount: 0,
                    status: Enums_1.StockStatus.OUT_OF_STOCK,
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
            if (!batch.isBlocked) {
                if (expTime >= nowTime) {
                    if (batch.currentQuantity > 0) {
                        totalValidQuantity = totalValidQuantity + batch.currentQuantity;
                    }
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
exports.StockStatusService = StockStatusService;
