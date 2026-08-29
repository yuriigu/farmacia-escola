import type { Medicine, Batch } from '@/lib/types';

export const mockMedicine: Medicine = {
  id: 1,
  name: 'Paracetamol',
  activeIngredient: 'Paracetamol',
  dosage: '500mg',
  category: 'Analgésico / Antipirético',
  accessibleDesc: 'Medicamento para alívio de dores e febre',
  totalQuantity: 150,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export const mockMedicinesList: Medicine[] = [
  mockMedicine,
  {
    id: 2,
    name: 'Dipirona',
    activeIngredient: 'Dipirona Monoidratada',
    dosage: '500mg/ml',
    category: 'Analgésico',
    accessibleDesc: 'Medicamento em gotas para dor e febre',
    totalQuantity: 80,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Amoxicilina',
    activeIngredient: 'Amoxicilina Tri-hidratada',
    dosage: '500mg',
    category: 'Antibiótico',
    accessibleDesc: 'Antibiótico para infecções bacterianas',
    totalQuantity: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const mockBatch: Batch = {
  id: 1,
  medicineId: 1,
  batchNumber: 'LOTE-2025-001',
  currentQuantity: 100,
  expirationDate: '2026-12-31T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  medicine: mockMedicine,
};

export const mockBatchesList: Batch[] = [
  mockBatch,
  {
    id: 2,
    medicineId: 1,
    batchNumber: 'LOTE-2025-002',
    currentQuantity: 50,
    expirationDate: '2026-06-30T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    medicine: mockMedicine,
  },
];
