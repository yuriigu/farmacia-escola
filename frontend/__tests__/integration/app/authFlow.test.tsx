import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '@/components/pages/LoginPage';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';
import { mockUser } from '../../fixtures/user.fixture';

vi.mock('@/services/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
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

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, loading: false });
    localStorage.clear();
  });

  it('deve autenticar usuário no login e persistir no auth store', async () => {
    const user = userEvent.setup();
    (api.auth.login as any).mockResolvedValue({
      token: 'jwt-auth-token-xyz',
      user: mockUser,
    });

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitBtn = screen.getByRole('button', { name: /entrar no sistema/i });

    await user.type(emailInput, 'admin@farmacia.ufba.br');
    await user.type(passwordInput, 'admin123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('jwt-auth-token-xyz');
      expect(useAuthStore.getState().user?.email).toBe('admin@farmacia.ufba.br');
    });
  });
});
