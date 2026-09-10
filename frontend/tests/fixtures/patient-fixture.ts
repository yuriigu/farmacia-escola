import type { Patient } from '@/lib/types';

export const mockPatient: Patient = {
  id: 1,
  name: 'Maria Silva Santos',
  cpf: '123.456.789-00',
  phone: '(71) 98765-4321',
  birthDate: '1985-06-15T00:00:00.000Z',
  address: 'Rua das Flores, 123, Salvador - BA',
  userId: 3,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export const mockPatientsList: Patient[] = [
  mockPatient,
  {
    id: 2,
    name: 'João Oliveira',
    cpf: '987.654.321-99',
    phone: '(71) 99123-4567',
    birthDate: '1978-03-22T00:00:00.000Z',
    address: 'Av. Sete de Setembro, 456, Salvador - BA',
    userId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
