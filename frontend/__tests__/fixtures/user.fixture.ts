import type { AuthUser, User } from '@/lib/types';

export const mockUser: AuthUser = {
  id: 1,
  name: 'Admin Teste',
  email: 'admin@farmacia.ufba.br',
  role: 'ADMIN',
  active: true,
};

export const mockPharmacistUser: AuthUser = {
  id: 2,
  name: 'Farmacêutico Teste',
  email: 'farmaceutico@farmacia.ufba.br',
  role: 'FARMACEUTICO',
  active: true,
};

export const mockPatientUser: AuthUser = {
  id: 3,
  name: 'Paciente Teste',
  email: 'paciente@teste.com',
  role: 'PACIENTE',
  patientId: 1,
  active: true,
};

export const mockUsersList: User[] = [
  {
    id: 1,
    name: 'Admin Teste',
    email: 'admin@farmacia.ufba.br',
    role: 'ADMIN',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Farmacêutico Teste',
    email: 'farmaceutico@farmacia.ufba.br',
    role: 'FARMACEUTICO',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
