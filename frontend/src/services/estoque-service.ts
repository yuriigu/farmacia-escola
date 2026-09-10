import { api } from './api';
import { Medicine, Batch, Withdrawal, Disposal } from '@/types';

export const estoqueService = {
  getMedicines: () => api.get<Medicine[]>('/medicines'),
  createMedicine: (data: Partial<Medicine>) => api.post<Medicine>('/medicines', data),
  
  getBatches: () => api.get<Batch[]>('/batches'),
  createBatch: (data: Partial<Batch>) => api.post<Batch>('/batches', data),
  blockBatch: (id: number, data: { isBlocked: boolean; blockReason?: string | null }) =>
    api.patch<Batch>('/batches/' + id + '/block', data),
  adjustBatch: (id: number, data: { newQuantity: number; reason: string }) =>
    api.post<Batch>('/batches/' + id + '/adjustments', data),
  
  getWithdrawals: () => api.get<Withdrawal[]>('/withdrawals'),
  createWithdrawal: (data: Partial<Withdrawal>) => api.post<Withdrawal>('/withdrawals', data),
  
  getDisposals: () => api.get<Disposal[]>('/disposals'),
  createDisposal: (data: Partial<Disposal>) => api.post<Disposal>('/disposals', data),
};