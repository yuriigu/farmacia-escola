import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientsPage } from '@/components/pages/PatientsPage';
import { api } from '@/lib/api';
import { mockPatient, mockPatientsList } from '../../fixtures/patient.fixture';

vi.mock('@/lib/api', () => ({
  api: {
    getPatients: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    deletePatient: vi.fn(),
  },
}));

describe('PatientForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getPatients as any).mockResolvedValue(mockPatientsList);
  });

  it('deve renderizar botão de novo paciente e abrir modal', async () => {
    const user = userEvent.setup();
    render(<PatientsPage />);

    const newBtn = await screen.findByRole('button', { name: /novo paciente/i });
    expect(newBtn).toBeInTheDocument();

    await user.click(newBtn);

    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument();
  });

  it('deve preencher e submeter formulário de cadastro de paciente', async () => {
    const user = userEvent.setup();
    (api.createPatient as any).mockResolvedValue(mockPatient);

    render(<PatientsPage />);

    const newBtn = await screen.findByRole('button', { name: /novo paciente/i });
    await user.click(newBtn);

    const nameInput = screen.getByLabelText(/nome completo/i);
    const cpfInput = screen.getByLabelText(/cpf/i);
    const phoneInput = screen.getByLabelText(/telefone/i);

    await user.type(nameInput, 'Carlos Santos');
    await user.type(cpfInput, '111.222.333-44');
    await user.type(phoneInput, '(71) 98888-7777');

    const saveBtn = screen.getByRole('button', { name: /salvar paciente/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.createPatient).toHaveBeenCalled();
    });
  });
});
