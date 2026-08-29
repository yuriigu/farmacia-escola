import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';
import { mockUser } from '../../fixtures/user.fixture';
import { mockMedicinesList, mockBatchesList } from '../../fixtures/medicine.fixture';
import { mockAppointmentsList } from '../../fixtures/appointment.fixture';

vi.mock('@/services/api', () => ({
  api: {
    medicines: { getAll: vi.fn() },
    appointments: { getAll: vi.fn() },
    batches: { getAll: vi.fn() },
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('DashboardPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'test-token', user: mockUser, loading: false });
    (api.medicines.getAll as any).mockResolvedValue(mockMedicinesList);
    (api.appointments.getAll as any).mockResolvedValue(mockAppointmentsList);
    (api.batches.getAll as any).mockResolvedValue(mockBatchesList);
  });

  it('deve carregar dados e renderizar os cards do dashboard', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(/visão geral do sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/total em estoque/i)).toBeInTheDocument();
  });
});
