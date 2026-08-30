export const mockUser = {
  id: 1,
  name: 'Admin Teste',
  email: 'admin@farmacia.ufba.br',
  password: '$2a$10$hashedpasswordstringforauth',
  role: 'ADMIN' as const,
  registration: 'ADM123',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockPharmacistUser = {
  id: 2,
  name: 'Farmacêutico Teste',
  email: 'farmaceutico@farmacia.ufba.br',
  password: '$2a$10$hashedpasswordstringforauth',
  role: 'FARMACEUTICO' as const,
  registration: 'CRF456',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockPatientUser = {
  id: 3,
  name: 'Paciente Teste',
  email: 'paciente@gmail.com',
  password: '$2a$10$hashedpasswordstringforauth',
  role: 'PACIENTE' as const,
  registration: 'PAC789',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

export const mockUsersList = [mockUser, mockPharmacistUser, mockPatientUser];