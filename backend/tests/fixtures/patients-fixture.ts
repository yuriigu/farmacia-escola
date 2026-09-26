// fixture de paciente usada nos testes. representa um paciente tipico
// ja vinculado a um usuario do sistema (userid preenchido), que e o
// caso do paciente que faz login pra ver o proprio prontuario.
// valores fixos pra deixar os testes deterministicos.
export const mockPatient = {
  id: 1,
  name: 'Maria Silva Santos',
  cpf: '12345678901',
  phone: '71999998888',
  birthDate: new Date('1990-05-15T00:00:00.000Z'),
  address: 'Rua das Flores, 123 - Salvador, BA',
  userId: 3,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// lista com dois pacientes. o segundo tem userid null de proposito,
// pra cobrir o caso do paciente cadastrado pela equipe mas que ainda
// nao tem usuario de acesso (sem login). util em testes de listagem
// e de filtro por dono.
export const mockPatientsList = [
  mockPatient,
  {
    id: 2,
    name: 'João Pedro Oliveira',
    cpf: '98765432100',
    phone: '71988887777',
    birthDate: new Date('1985-10-20T00:00:00.000Z'),
    address: 'Av. Sete de Setembro, 456 - Salvador, BA',
    userId: null,
    createdAt: new Date('2025-01-02T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
  },
];