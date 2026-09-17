// LOG DE ATIVIDADE (TRILHA DE AUDITORIA)
export interface ActivityLogEntry {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
  createdAt: string;
  user?: { id: number; name: string; role: string };
}

// RESUMO CONSOLIDADO DO PANORAMA DE ESTOQUE (RETORNADO PELO BACKEND)
export interface StockStatusSummary {
  total: number;
  ok: number;
  low: number;
  critical: number;
  expired: number;
}