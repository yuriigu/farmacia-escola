import type { Appointment, ScheduleSlot } from '@/lib/types';
import { mockPatient } from './patient.fixture';
import { mockMedicine } from './medicine.fixture';

export const mockAppointment: Appointment = {
  id: 1,
  patientId: 1,
  scheduledDate: '2025-10-15T10:00:00.000Z',
  scheduledTime: '10:00',
  status: 'PENDING',
  notes: 'Primeira dispensação',
  patient: mockPatient,
  items: [
    {
      id: 1,
      appointmentId: 1,
      medicineId: 1,
      quantity: 2,
      medicine: mockMedicine,
    },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export const mockAppointmentsList: Appointment[] = [
  mockAppointment,
  {
    id: 2,
    patientId: 1,
    scheduledDate: '2025-10-16T14:00:00.000Z',
    scheduledTime: '14:00',
    status: 'CONFIRMED',
    notes: 'Retirada regular',
    patient: mockPatient,
    items: [
      {
        id: 2,
        appointmentId: 2,
        medicineId: 1,
        quantity: 1,
        medicine: mockMedicine,
      },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const mockScheduleSlot: ScheduleSlot = {
  id: 1,
  date: '2025-10-15',
  startTime: '08:00',
  endTime: '12:00',
  capacity: 10,
  bookedCount: 2,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};
