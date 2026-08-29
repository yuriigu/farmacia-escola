import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients, usePatient } from '@/services/queries';
import { api } from '@/services/api';
import { mockPatient, mockPatientsList } from '../../fixtures/patient.fixture';

vi.mock('@/services/api', () => ({
  api: {
    patients: {
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
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

describe('usePatients Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar lista de pacientes com sucesso', async () => {
    (api.patients.getAll as any).mockResolvedValue(mockPatientsList);

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPatientsList);
    expect(api.patients.getAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar paciente específico por ID', async () => {
    (api.patients.getById as any).mockResolvedValue(mockPatient);

    const { result } = renderHook(() => usePatient(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPatient);
    expect(api.patients.getById).toHaveBeenCalledWith(1);
  });
});
