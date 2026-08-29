import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientList } from '@/components/modules/PatientList';
import { mockPatientsList } from '../../fixtures/patient.fixture';

describe('PatientList Component', () => {
  it('deve renderizar lista de pacientes', () => {
    const { getByText } = render(<PatientList patients={mockPatientsList} />);

    expect(getByText('Maria Silva Santos')).toBeInTheDocument();
    expect(getByText('João Oliveira')).toBeInTheDocument();
  });

  it('deve filtrar pacientes ao digitar na busca', async () => {
    const user = userEvent.setup();
    const { getByLabelText, getByText, queryByText } = render(<PatientList patients={mockPatientsList} />);

    const searchInput = getByLabelText('Buscar pacientes');
    await user.type(searchInput, 'Maria');

    expect(getByText('Maria Silva Santos')).toBeInTheDocument();
    expect(queryByText('João Oliveira')).not.toBeInTheDocument();
  });

  it('deve chamar callback onSelectPatient ao clicar em paciente', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const { getByTestId } = render(<PatientList patients={mockPatientsList} onSelectPatient={handleSelect} />);

    const patientRow = getByTestId('patient-item-1');
    await user.click(patientRow);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockPatientsList[0]);
  });
});