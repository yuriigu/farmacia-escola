import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/modules/LoginForm';
import { useAuthStore } from '@/lib/auth-store';

describe('Login Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, loading: false });
  });

  it('deve realizar fluxo completo de submissão do formulário de login', async () => {
    const user = userEvent.setup();
    const handleLoginSubmit = vi.fn().mockImplementation(async ({ email, password }) => {
      useAuthStore.getState().setAuth('mock-token-abc', {
        id: 1,
        name: 'Administrador UFBA',
        email,
        role: 'ADMIN',
        active: true,
      });
    });

    const { getByLabelText, getByRole } = render(<LoginForm onSubmit={handleLoginSubmit} />);

    const emailInput = getByLabelText(/e-mail/i);
    const passwordInput = getByLabelText(/senha/i);
    const submitButton = getByRole('button', { name: /entrar/i });

    await user.type(emailInput, 'admin@farmacia.ufba.br');
    await user.type(passwordInput, 'senha123');
    await user.click(submitButton);

    expect(handleLoginSubmit).toHaveBeenCalledWith({
      email: 'admin@farmacia.ufba.br',
      password: 'senha123',
    });

    const authState = useAuthStore.getState();
    expect(authState.token).toBe('mock-token-abc');
    expect(authState.user?.name).toBe('Administrador UFBA');
    expect(authState.user?.role).toBe('ADMIN');
  });
});
