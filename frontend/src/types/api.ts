// entrada de log de atividade (trilha de auditoria).
// cada registro descreve uma acao feita no sistema: quem fez
// (userid), o que (action), em qual entidade (entity), qual id
// dessa entidade (entityid, opcional), detalhes extras (details)
// e quando (createdat). o campo user, quando presente, traz um
// resumo do autor pro front nao precisar buscar em outro lugar.
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

// resumo consolidado do panorama de estoque. e o formato que o
// backend devolve no get /api/dashboard/stock-status, ja com as
// contagens por faixa (em dia, baixo, critico, vencido) prontas
// pra alimentar os cards do dashboard sem calculo no cliente.
export interface StockStatusSummary {
  total: number;
  ok: number;
  low: number;
  critical: number;
  expired: number;
}