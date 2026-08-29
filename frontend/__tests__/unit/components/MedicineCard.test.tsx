import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockStatusBadge } from '@/components/shared/StockStatusBadge';
import { ExpiryBadge } from '@/components/shared/ExpiryBadge';

describe('MedicineCard & Stock Badges', () => {
  it('deve exibir status "Em Estoque" quando quantidade for adequada', () => {
    render(<StockStatusBadge quantity={100} minStock={10} />);
    expect(screen.getByText(/em estoque/i)).toBeInTheDocument();
  });

  it('deve exibir status "Estoque Baixo" quando quantidade estiver abaixo do mínimo', () => {
    render(<StockStatusBadge quantity={5} minStock={10} />);
    expect(screen.getByText(/estoque baixo/i)).toBeInTheDocument();
  });

  it('deve exibir status "Esgotado" quando quantidade for zero', () => {
    render(<StockStatusBadge quantity={0} minStock={10} />);
    expect(screen.getByText(/esgotado/i)).toBeInTheDocument();
  });

  it('deve exibir data de validade com formato adequado', () => {
    render(<ExpiryBadge date="2027-12-31T00:00:00.000Z" />);
    expect(screen.getByText(/válido/i)).toBeInTheDocument();
  });

  it('deve indicar lote vencido para datas passadas', () => {
    render(<ExpiryBadge date="2020-01-01T00:00:00.000Z" />);
    expect(screen.getByText(/vencido/i)).toBeInTheDocument();
  });
});
