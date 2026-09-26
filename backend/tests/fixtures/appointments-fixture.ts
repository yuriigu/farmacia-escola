import { mockPatient } from './patients-fixture';
import { mockMedicine } from './medicines-fixture';
import { mockUser } from './users-fixture';

// fixture de agendamento usada nos testes. monta um objeto com o
// formato esperado do model appointment, ja com relacionamentos
// resolvidos (patient, doctor, items com medicine).
// os valores sao fixos de proposito: data, status e notas constantes
// pra deixar os testes deterministicos e faceis de comparar.
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
  // itens da consulta: lista com um unico medicamento ja vinculado.
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

// versao em lista do agendamento, util pra testar endpoints que
// devolvem array (listagens, filtros, paginacao).
export const mockAppointmentsList = [mockAppointment];