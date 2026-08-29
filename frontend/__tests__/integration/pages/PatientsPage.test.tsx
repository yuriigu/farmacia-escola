import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientsPage } from '@/components/pages/PatientsPage';
import { api } from '@/lib/api';
import { mockPatientsList } from '../../fixtures/patient.fixture';

vi.mock('@/lib/api', () => ({
  api: {
    getPatients: vi.fn(),
    createPatient: vi.fn(),
  },
}));

describe('PatientsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getPatients as any).mockResolvedValue(mockPatientsList);
  });

  it('deve renderizar a tabela e lista de pacientes carregada da API', async () => {
    render(<PatientsPage />);

    expect(await screen.findByText(mockPatientsList[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockPatientsList[1].name)).toBeInTheDocument();
  });
});
