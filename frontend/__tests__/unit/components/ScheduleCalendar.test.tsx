import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { useAuthStore } from '@/lib/auth-store';
import { mockUser } from '../../fixtures/user.fixture';
import { mockAppointmentsList } from '../../fixtures/appointment.fixture';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    appointments: {
      getAll: vi.fn(),
    },
    scheduleSlots: {
      getAll: vi.fn().mockResolvedValue([]),
    },
    medicines: {
      getAll: vi.fn().mockResolvedValue([]),
    },
    patients: {
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

describe('ScheduleCalendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'test-token', user: mockUser, loading: false });
    (api.appointments.getAll as any).mockResolvedValue(mockAppointmentsList);
  });

  it('deve renderizar abas do módulo de agenda', async () => {
    const moduleConfig = {
      id: 'agenda',
      label: 'Agenda',
      tabs: [
        { id: 'agenda', label: 'Visão Geral' },
        { id: 'agendamentos', label: 'Agendamentos' },
      ],
    };

    renderWithProviders(
      <CalendarModule
        module={moduleConfig as any}
        activeTab="agenda"
        onTabChange={vi.fn()}
      />
    );

    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Agendamentos')).toBeInTheDocument();
  });
});
