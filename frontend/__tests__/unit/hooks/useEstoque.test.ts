import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEstoque } from '@/hooks/UseEstoque';
import { estoqueService } from '@/services/estoqueService';
import { mockMedicine, mockMedicinesList, mockBatch, mockBatchesList } from '../../fixtures/medicine.fixture';

vi.mock('@/services/estoqueService', () => ({
  estoqueService: {
    getMedicines: vi.fn(),
    getBatches: vi.fn(),
    getWithdrawals: vi.fn(),
    getDisposals: vi.fn(),
    createMedicine: vi.fn(),
    createBatch: vi.fn(),
  },
}));

describe('useEstoque Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (estoqueService.getMedicines as any).mockResolvedValue(mockMedicinesList);
    (estoqueService.getBatches as any).mockResolvedValue(mockBatchesList);
    (estoqueService.getWithdrawals as any).mockResolvedValue([]);
    (estoqueService.getDisposals as any).mockResolvedValue([]);
  });

  it('deve carregar dados de estoque na montagem', async () => {
    const { result } = renderHook(() => useEstoque());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medicines).toEqual(mockMedicinesList);
    expect(result.current.batches).toEqual(mockBatchesList);
  });

  it('addMedicine deve cadastrar medicamento e atualizar estado', async () => {
    const newMed = { id: 10, name: 'Dipirona 500mg', totalQuantity: 50 };
    (estoqueService.createMedicine as any).mockResolvedValue(newMed);

    const { result } = renderHook(() => useEstoque());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const created = await result.current.addMedicine({ name: 'Dipirona 500mg' } as any);
      expect(created).toEqual(newMed);
    });

    expect(result.current.medicines).toContainEqual(newMed);
  });
});
