import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estoqueService } from '@/services/estoqueService';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('estoqueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMedicines deve buscar medicamentos', async () => {
    const mockMeds = [{ id: 1, name: 'Paracetamol' }];
    (api.get as any).mockResolvedValue(mockMeds);

    const result = await estoqueService.getMedicines();

    expect(api.get).toHaveBeenCalledWith('/medicines');
    expect(result).toEqual(mockMeds);
  });

  it('createMedicine deve cadastrar medicamento', async () => {
    const payload = { name: 'Amoxicilina', dosage: '500mg' };
    (api.post as any).mockResolvedValue({ id: 2, ...payload });

    const result = await estoqueService.createMedicine(payload);

    expect(api.post).toHaveBeenCalledWith('/medicines', payload);
    expect(result.id).toBe(2);
  });

  it('getBatches deve buscar lotes de medicamentos', async () => {
    const mockBatches = [{ id: 1, batchNumber: 'LOTE-123', currentQuantity: 100 }];
    (api.get as any).mockResolvedValue(mockBatches);

    const result = await estoqueService.getBatches();

    expect(api.get).toHaveBeenCalledWith('/batches');
    expect(result).toEqual(mockBatches);
  });

  it('createBatch deve criar novo lote', async () => {
    const payload = { medicineId: 1, batchNumber: 'LOTE-999', currentQuantity: 50 };
    (api.post as any).mockResolvedValue({ id: 5, ...payload });

    const result = await estoqueService.createBatch(payload);

    expect(api.post).toHaveBeenCalledWith('/batches', payload);
    expect(result.id).toBe(5);
  });

  it('getWithdrawals deve buscar dispensações', async () => {
    const mockWithdrawals = [{ id: 1, quantity: 2 }];
    (api.get as any).mockResolvedValue(mockWithdrawals);

    const result = await estoqueService.getWithdrawals();

    expect(api.get).toHaveBeenCalledWith('/withdrawals');
    expect(result).toEqual(mockWithdrawals);
  });

  it('createWithdrawal deve registrar retirada', async () => {
    const payload = { batchId: 1, quantity: 1, notes: 'Uso contínuo' };
    (api.post as any).mockResolvedValue({ id: 10, ...payload });

    const result = await estoqueService.createWithdrawal(payload);

    expect(api.post).toHaveBeenCalledWith('/withdrawals', payload);
    expect(result.id).toBe(10);
  });

  it('getDisposals deve buscar descarte de medicamentos', async () => {
    const mockDisposals = [{ id: 1, quantity: 10, reason: 'Vencido' }];
    (api.get as any).mockResolvedValue(mockDisposals);

    const result = await estoqueService.getDisposals();

    expect(api.get).toHaveBeenCalledWith('/disposals');
    expect(result).toEqual(mockDisposals);
  });

  it('createDisposal deve registrar descarte', async () => {
    const payload = { batchId: 1, quantity: 5, reason: 'Embalagem violada' };
    (api.post as any).mockResolvedValue({ id: 7, ...payload });

    const result = await estoqueService.createDisposal(payload);

    expect(api.post).toHaveBeenCalledWith('/disposals', payload);
    expect(result.id).toBe(7);
  });
});
