// DESCARTE DE MEDICAMENTO (MATCHES formatDisposals DO BACKEND)
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

// RASCUNHO DE DESCARTE (FORMULARIOS)
export interface DisposalDraft {
  batchId: number;
  quantity: number;
  reason: string;
  notes?: string;
}