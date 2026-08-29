import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from '@/components/shared/TabBar';

describe('Navigation Flow Integration', () => {
  it('deve alternar abas de navegação e disparar callback', async () => {
    const user = userEvent.setup();
    const handleTabChange = vi.fn();

    const tabs = [
      { id: 'medicamentos', label: 'Medicamentos' },
      { id: 'lotes', label: 'Lotes de Estoque' },
      { id: 'retiradas', label: 'Dispensações' },
    ];

    render(
      <TabBar
        tabs={tabs}
        activeTab="medicamentos"
        onTabChange={handleTabChange}
      />
    );

    expect(screen.getByText('Medicamentos')).toBeInTheDocument();
    expect(screen.getByText('Lotes de Estoque')).toBeInTheDocument();

    const tabLotes = screen.getByText('Lotes de Estoque');
    await user.click(tabLotes);

    expect(handleTabChange).toHaveBeenCalledWith('lotes');
  });
});
