import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/modules/LoginForm';

describe('LoginForm Component', () => {
  it('deve renderizar os campos de email, senha e botão de entrar', () => {
    const { getByLabelText, getByRole } = render(<LoginForm />);

    expect(getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(getByLabelText(/senha/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('deve permitir digitação nos campos de entrada', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(<LoginForm />);

    const emailInput = getByLabelText(/e-mail/i);
    const passwordInput = getByLabelText(/senha/i);

    await user.type(emailInput, 'usuario@ufba.br');
    await user.type(passwordInput, 'senhaSegura123');

    expect(emailInput).toHaveValue('usuario@ufba.br');
    expect(passwordInput).toHaveValue('senhaSegura123');
  });

  it('deve chamar onSubmit com credenciais corretas', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const { getByLabelText, getByRole } = render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(getByLabelText(/e-mail/i), 'admin@ufba.br');
    await user.type(getByLabelText(/senha/i), '123456');
    await user.click(getByRole('button', { name: /entrar/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'admin@ufba.br',
      password: '123456',
    });
  });

  it('deve desabilitar o botão quando isLoading for verdadeiro', () => {
    const { getByRole } = render(<LoginForm isLoading={true} />);

    const button = getByRole('button', { name: /entrando/i });
    expect(button).toBeDisabled();
  });
});