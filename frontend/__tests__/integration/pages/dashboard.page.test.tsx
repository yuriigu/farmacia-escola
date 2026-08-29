import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardStats } from '@/components/modules/DashboardStats';
import { MedicineCard } from '@/components/modules/MedicineCard';
import { PatientList } from '@/components/modules/PatientList';
import { mockMedicinesList } from '../../fixtures/medicine.fixture';
import { mockPatientsList } from '../../fixtures/patient.fixture';

describe('Dashboard Integration Overview', () => {
  it('deve renderizar métricas, cartões de medicamentos e lista de pacientes integrados', () => {
    const { getByTestId, getByText } = render(
      <div className="space-y-6">
        <DashboardStats
          totalMedicines={mockMedicinesList.length}
          totalPatients={mockPatientsList.length}
          lowStockCount={1}
          pendingAppointments={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Medicamentos em Destaque</h3>
            {mockMedicinesList.slice(0, 2).map((med) => (
              <MedicineCard key={med.id} medicine={med} />
            ))}
          </div>
          <div className="space-y-4">
            <PatientList patients={mockPatientsList} />
          </div>
        </div>
      </div>
    );

    // Verify stats
    expect(getByTestId('stat-medicines')).toHaveTextContent(String(mockMedicinesList.length));
    expect(getByTestId('stat-patients')).toHaveTextContent(String(mockPatientsList.length));

    // Verify medicines
    expect(getByText('Paracetamol')).toBeInTheDocument();
    expect(getByText('Dipirona')).toBeInTheDocument();

    // Verify patients
    expect(getByText('Maria Silva Santos')).toBeInTheDocument();
    expect(getByText('João Oliveira')).toBeInTheDocument();
  });
});