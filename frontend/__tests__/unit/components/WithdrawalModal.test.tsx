import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WithdrawalsPage } from '@/components/pages/WithdrawalsPage';
import { usePharmacyStore } from '@/lib/pharmacy-store';
import { mockMedicinesList, mockBatchesList } from '../../fixtures/medicine.fixture';
import { mockPatientsList } from '../../fixtures/patient.fixture';

describe('WithdrawalModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePharmacyStore.setState({
      medicines: mockMedicinesList,
      batches: mockBatchesList,
      patients: mockPatientsList,
      withdrawals: [],
    });
  });

  it('deve renderizar botão para registrar nova dispensação / retirada', () => {
    render(<WithdrawalsPage />);

    expect(screen.getByRole('button', { name: /nova retirada/i })).toBeInTheDocument();
  });

  it('deve abrir modal ao clicar no botão de nova retirada', async () => {
    const user = userEvent.setup();
    render(<WithdrawalsPage />);

    const newBtn = screen.getByRole('button', { name: /nova retirada/i });
    await user.click(newBtn);

    expect(screen.getByText(/registrar retirada de medicamento/i)).toBeInTheDocument();
  });
});
