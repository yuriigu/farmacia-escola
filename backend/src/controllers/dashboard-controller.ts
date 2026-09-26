import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { prisma } from '../utils/prisma';

// controller do painel (dashboard). por enquanto expoe so o panorama
// de estoque, que alimenta os cards de resumo na tela inicial.
// a ideia e dar uma visao rapida pra farmacia sem precisar abrir
// a lista completa de lotes.
export class DashboardController {
  // calcula o panorama do estoque: quantos lotes estao vencidos,
  // quantos medicamentos estao criticos, baixos ou em dia.
  // a classificacao e feita por medicamento, somando apenas os lotes
  // validos (nao vencidos) e aplicando faixas fixas de quantidade.
  getStockStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // puxamos so os campos necessarios de cada lote pra economizar.
      // ignoramos lotes de medicamentos deletados (soft delete).
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

      // contadores que vao virar os numeros do painel.
      const counts = {
        total: batches.length,
        ok: 0,
        low: 0,
        critical: 0,
        expired: 0,
      };

      const now = Date.now();

      // duas coisas acontecem nesse laco:
      // 1) lotes vencidos sao contados no nivel de lote (cada lote vencido = 1)
      // 2) lotes validos tem a quantidade somada por medicamento,
      //    porque a classificacao de critico/baixo/ok olha o total do medicamento,
      //    nao cada lote isolado.
      const activeStockByMedicine = new Map<number, number>();
      for (const batch of batches) {
        if (batch.expirationDate.getTime() < now) {
          counts.expired = counts.expired + 1;
          continue;
        }
        const currentTotal = activeStockByMedicine.get(batch.medicineId) || 0;
        activeStockByMedicine.set(batch.medicineId, currentTotal + batch.currentQuantity);
      }

      // agora classificamos por medicamento, com base no saldo valido somado:
      // - critico: entre 1 e 30 unidades
      // - baixo: entre 31 e 50 unidades
      // - em dia: acima de 50 unidades
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