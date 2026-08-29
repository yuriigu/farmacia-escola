import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardStats } from '@/components/modules/DashboardStats';

describe('DashboardStats Component', () => {
  it('deve renderizar contadores corretamente', () => {
    const { getByTestId } = render(
      <DashboardStats
        totalMedicines={45}
        totalPatients={120}
        lowStockCount={3}
        pendingAppointments={8}
      />
    );

    expect(getByTestId('stat-medicines')).toHaveTextContent('45');
    expect(getByTestId('stat-patients')).toHaveTextContent('120');
    expect(getByTestId('stat-low-stock')).toHaveTextContent('3');
    expect(getByTestId('stat-appointments')).toHaveTextContent('8');
  });
});