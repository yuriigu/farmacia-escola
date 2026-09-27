// descarte de medicamento. casa com o formato que o backend
// devolve no /api/disposals (formatdisposals). alem dos campos
// base (quantidade, motivo, status), traz o batch resumido com
// aliases legados (code/expiresat) e o nome do usuario que
// registrou. status disposed = ativo, reverted = ja estornado.
export interface Disposal {
  id: number;
  createdAt: string;
  date?: string;
  quantity: number;
  reason: string;
  notes?: string | null;
  status: 'DISPOSED' | 'REVERTED' | string;
  revertReason?: string | null;
  reverted?: boolean;
  batch: {
    id: number;
    batchNumber: string;
    code: string;
    expirationDate: string;
    expiresAt: string;
    medicine: {
      id?: number;
      name: string;
      dosage?: string | null;
    };
  };
  user: {
    name: string;
  };
}

// rascunho de descarte usado no formulario de registro.
// e a versao enxuta com so o que o usuario preenche antes de
// mandar pra api.
export interface DisposalDraft {
  batchId: number;
  quantity: number;
  reason: string;
  notes?: string;
}