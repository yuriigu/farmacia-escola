import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryPage } from '@/components/pages/InventoryPage';
import { api } from '@/services/api';
import { useAuthStore } from '@/lib/auth-store';
import { mockUser } from '../../fixtures/user.fixture';
import { mockMedicinesList } from '../../fixtures/medicine.fixture';

vi.mock('@/services/api', () => ({
  api: {
    medicines: {
      getAll: vi.fn(),
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

describe('InventoryPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'test-token', user: mockUser, loading: false });
    (api.medicines.getAll as any).mockResolvedValue(mockMedicinesList);
  });

  it('deve carregar catálogo de medicamentos no estoque', async () => {
    renderWithProviders(<InventoryPage />);

    expect(await screen.findByText(/catálogo de medicamentos/i)).toBeInTheDocument();
    expect(screen.getByText(mockMedicinesList[0].name)).toBeInTheDocument();
  });
});
