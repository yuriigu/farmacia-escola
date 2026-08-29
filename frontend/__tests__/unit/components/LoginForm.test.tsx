import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '@/components/pages/LoginPage';
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

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar campos de email e senha e botão de entrar', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
  });

  it('deve exibir erro de validação para email inválido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /entrar no sistema/i });

    await user.type(emailInput, 'email-invalido');
    await user.click(submitBtn);

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
  });

  it('deve submeter formulário com credenciais corretas', async () => {
    const user = userEvent.setup();
    (api.auth.login as any).mockResolvedValue({
      token: 'valid-token',
      user: mockUser,
    });

    renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitBtn = screen.getByRole('button', { name: /entrar no sistema/i });

    await user.type(emailInput, 'admin@farmacia.ufba.br');
    await user.type(passwordInput, 'senhaSegura123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith('admin@farmacia.ufba.br', 'senhaSegura123');
    });
  });
});
