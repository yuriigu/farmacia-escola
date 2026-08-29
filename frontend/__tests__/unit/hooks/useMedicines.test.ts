import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMedicines, useMedicine } from '@/services/queries';
import { api } from '@/services/api';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicine.fixture';

vi.mock('@/services/api', () => ({
  api: {
    medicines: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMedicines Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar lista de medicamentos com sucesso', async () => {
    (api.medicines.getAll as any).mockResolvedValue(mockMedicinesList);

    const { result } = renderHook(() => useMedicines(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMedicinesList);
    expect(api.medicines.getAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar medicamento específico por ID', async () => {
    (api.medicines.getById as any).mockResolvedValue(mockMedicine);

    const { result } = renderHook(() => useMedicine(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMedicine);
    expect(api.medicines.getById).toHaveBeenCalledWith(1);
  });
});
