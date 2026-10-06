import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldError } from '@/components/ui/field-error';

describe('FieldError', () => {
  it('announces the message and exposes the matching description id', () => {
    render(<FieldError id="email-error" message="E-mail inválido" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', 'email-error');
    expect(alert).toHaveTextContent('E-mail inválido');
    expect(alert).toHaveClass('text-rose-600', 'dark:text-rose-400');
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});