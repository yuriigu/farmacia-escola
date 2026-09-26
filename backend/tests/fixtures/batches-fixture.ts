import { mockMedicine } from './medicines-fixture';

// fixture de lote de estoque usada nos testes. representa um lote
// tipico ja com o medicamento vinculado, e traz tanto os campos
// atuais do model (batchnumber, supplier, isblocked) quanto alguns
// aliases legados (code, manufacturer) que aparecem em consumidores
// antigos. a ideia e cobrir os dois formatos sem precisar de duas fixtures.
// valores fixos pra deixar os testes deterministicos.
export const mockBatch = {
  id: 1,
  medicineId: 1,
  batchNumber: 'LOTE-2025-001',
  code: 'LOTE-2025-001',
  initialQuantity: 100,
  currentQuantity: 80,
  expirationDate: new Date('2026-12-31T00:00:00.000Z'),
  manufacturingDate: new Date('2024-01-01T00:00:00.000Z'),
  supplier: 'Laboratório Farmacêutico Nacional',
  isBlocked: false,
  blockReason: null,
  manufacturer: 'Laboratório Farmacêutico Nacional',
  location: 'Prateleira A1',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  medicine: mockMedicine,
};

// versao em lista do lote, util pra testar endpoints que devolvem
// array (listagens, filtros, paginacao).
export const mockBatchesList = [mockBatch];