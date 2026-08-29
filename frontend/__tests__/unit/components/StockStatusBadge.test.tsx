import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';

describe('StockStatusBadge Component', () => {
  it('deve renderizar status ok (Em Dia)', () => {
    const { getByText } = render(<StockStatusBadge status="ok" />);
    expect(getByText('Em Dia')).toBeInTheDocument();
  });

  it('deve renderizar status low (Estoque Baixo)', () => {
    const { getByText } = render(<StockStatusBadge status="low" />);
    expect(getByText('Estoque Baixo')).toBeInTheDocument();
  });

  it('deve renderizar status critical (Crítico)', () => {
    const { getByText } = render(<StockStatusBadge status="critical" />);
    expect(getByText('Crítico')).toBeInTheDocument();
  });

  it('deve renderizar status expired (Vencido)', () => {
    const { getByText } = render(<StockStatusBadge status="expired" />);
    expect(getByText('Vencido')).toBeInTheDocument();
  });
});