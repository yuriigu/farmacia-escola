import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppointments, useAppointment } from '@/services/queries';
import { api } from '@/services/api';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointment.fixture';

vi.mock('@/services/api', () => ({
  api: {
    appointments: {
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

describe('useAppointments Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar lista de agendamentos', async () => {
    (api.appointments.getAll as any).mockResolvedValue(mockAppointmentsList);

    const { result } = renderHook(() => useAppointments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAppointmentsList);
    expect(api.appointments.getAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar agendamento por ID', async () => {
    (api.appointments.getById as any).mockResolvedValue(mockAppointment);

    const { result } = renderHook(() => useAppointment(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAppointment);
    expect(api.appointments.getById).toHaveBeenCalledWith(1);
  });
});
