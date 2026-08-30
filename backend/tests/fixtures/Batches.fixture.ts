import { mockMedicine } from './Medicines.fixture';

export const mockBatch = {
  id: 1,
  medicineId: 1,
  batchNumber: 'LOTE-2025-001',
  code: 'LOTE-2025-001',
  initialQuantity: 100,
  currentQuantity: 80,
  expirationDate: new Date('2026-12-31T00:00:00.000Z'),
  manufacturingDate: new Date('2024-01-01T00:00:00.000Z'),
  manufacturer: 'Laboratório Farmacêutico Nacional',
  location: 'Prateleira A1',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  medicine: mockMedicine,
};

export const mockBatchesList = [mockBatch];