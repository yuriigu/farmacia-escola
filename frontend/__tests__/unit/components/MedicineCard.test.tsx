import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicineCard } from '@/components/modules/MedicineCard';
import { mockMedicine } from '../../fixtures/medicine.fixture';

describe('MedicineCard Component', () => {
  it('deve renderizar informações do medicamento', () => {
    const { getByText } = render(<MedicineCard medicine={mockMedicine} />);

    expect(getByText('Paracetamol')).toBeInTheDocument();
    expect(getByText(/500mg/)).toBeInTheDocument();
    expect(getByText(/150 un/)).toBeInTheDocument();
    expect(getByText('Analgésico / Antipirético')).toBeInTheDocument();
  });

  it('deve acionar callback onSelect ao clicar no cartão', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();
    const { getByTestId } = render(<MedicineCard medicine={mockMedicine} onSelect={handleSelect} />);

    const card = getByTestId('medicine-card');
    await user.click(card);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockMedicine);
  });

  it('deve exibir status crítico quando quantidade for zero', () => {
    const zeroStockMed = { ...mockMedicine, totalQuantity: 0 };
    const { getByText } = render(<MedicineCard medicine={zeroStockMed} />);

    expect(getByText('Crítico')).toBeInTheDocument();
  });
});