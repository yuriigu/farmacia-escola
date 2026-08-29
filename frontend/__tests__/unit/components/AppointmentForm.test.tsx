import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentsPage } from '@/components/pages/AppointmentsPage';
import { api } from '@/services/api';
import { mockAppointmentsList } from '../../fixtures/appointment.fixture';
import { mockMedicinesList } from '../../fixtures/medicine.fixture';
import { mockPatientsList } from '../../fixtures/patient.fixture';

vi.mock('@/services/api', () => ({
  api: {
    appointments: {
      getAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    },
    medicines: {
      getAll: vi.fn(),
    },
    patients: {
      getAll: vi.fn(),
    },
    scheduleSlots: {
      getAll: vi.fn().mockResolvedValue([]),
    },
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

describe('AppointmentForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.appointments.getAll as any).mockResolvedValue(mockAppointmentsList);
    (api.medicines.getAll as any).mockResolvedValue(mockMedicinesList);
    (api.patients.getAll as any).mockResolvedValue(mockPatientsList);
  });

  it('deve renderizar listagem de agendamentos e botão de novo agendamento', async () => {
    renderWithProviders(<AppointmentsPage />);

    expect(await screen.findByText(/agendamentos de dispensação/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo agendamento/i })).toBeInTheDocument();
  });

  it('deve abrir modal de agendamento ao clicar no botão', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppointmentsPage />);

    const newBtn = screen.getByRole('button', { name: /novo agendamento/i });
    await user.click(newBtn);

    expect(await screen.findByText(/novo agendamento/i)).toBeInTheDocument();
  });
});
