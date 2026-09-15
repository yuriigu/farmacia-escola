import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { prisma } from '../utils/prisma';

// CATEGORIAS DE STATUS DO ESTOQUE (classificação em tempo de execução, sem entidade no banco)
type StockStatusCategory = 'ok' | 'low' | 'critical' | 'expired';

export class DashboardController {
  getStockStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const batches = await prisma.stockBatch.findMany({
        where: {
          medicine: {
            deletedAt: null,
          },
        },
        select: {
          medicineId: true,
          currentQuantity: true,
          expirationDate: true,
        },
      });

      const counts = {
        total: batches.length,
        ok: 0,
        low: 0,
        critical: 0,
        expired: 0,
      };

      const now = Date.now();

      // 1) VENCIDOS — avaliação individual no nível de LOTE
      // 2) ESTOQUE ATIVO — soma das quantidades dos lotes VÁLIDOS agrupadas por MEDICAMENTO
      const activeStockByMedicine = new Map<number, number>();
      for (const batch of batches) {
        if (batch.expirationDate.getTime() < now) {
          counts.expired = counts.expired + 1;
          continue;
        }
        const currentTotal = activeStockByMedicine.get(batch.medicineId) || 0;
        activeStockByMedicine.set(batch.medicineId, currentTotal + batch.currentQuantity);
      }

      // 3) CLASSIFICAÇÃO POR MEDICAMENTO (faixas fixas sobre o saldo ativo somado):
      // - Crítico: total de unidades válidas entre 1 e 30.
      // - Baixo: total de unidades válidas entre 31 e 50.
      // - Em dia: total de unidades válidas acima de 50.
      for (const totalUnits of activeStockByMedicine.values()) {
        if (totalUnits >= 1 && totalUnits <= 30) {
          counts.critical = counts.critical + 1;
        } else if (totalUnits >= 31 && totalUnits <= 50) {
          counts.low = counts.low + 1;
        } else if (totalUnits > 50) {
          counts.ok = counts.ok + 1;
        }
      }

      res.json(counts);
      return;
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao calcular o panorama de estoque' });
      return;
    }
  };
}
