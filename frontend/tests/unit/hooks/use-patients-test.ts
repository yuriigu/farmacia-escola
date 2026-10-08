import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients, usePatient } from '@/services/queries';
import { api } from '@/services/api';
import { useAuthStore } from '@/lib/auth-store';
import { mockPatient, mockPatientsList } from '../../fixtures/patient-fixture';

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
    useAuthStore.setState({
      user: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
    });
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

  it('não deve buscar pacientes para o perfil PACIENTE', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'Paciente', email: 'paciente@example.com', role: 'PACIENTE', patientId: 2 },
    });

    const { result } = renderHook(() => usePatients(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.patients.getAll).not.toHaveBeenCalled();
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
