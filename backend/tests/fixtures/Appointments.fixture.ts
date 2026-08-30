import { mockPatient } from './Patients.fixture';
import { mockMedicine } from './Medicines.fixture';
import { mockUser } from './Users.fixture';

export const mockAppointment = {
  id: 1,
  patientId: 1,
  doctorId: 1,
  scheduledDate: new Date('2025-10-15T10:00:00.000Z'),
  scheduledTime: '10:00',
  status: 'PENDING' as const,
  notes: 'Primeira consulta de acompanhamento',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  patient: mockPatient,
  doctor: mockUser,
  items: [
    {
      id: 1,
      appointmentId: 1,
      medicineId: 1,
      quantity: 2,
      instructions: '1 comprimido ao dia',
      medicine: mockMedicine,
    },
  ],
};

export const mockAppointmentsList = [mockAppointment];