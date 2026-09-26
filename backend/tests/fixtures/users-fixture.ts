// fixtures de usuario usadas nos testes. cada uma representa um dos
// papeis mais relevantes do sistema, pra que os casos de teste possam
// escolher o cenario certo de autorizacao sem inventar dados do zero.
// os valores sao fixos de proposito pra deixar os testes deterministicos.

// usuario com perfil admin. e o que passa em tudo na matriz de
// permissoes e costuma ser o ponto de partida dos testes de gestao.
export const mockUser = {
  id: 1,
  name: 'Admin Teste',
  email: 'admin@farmacia.ufba.br',
  role: 'ADMIN' as const,
  registration: 'ADM123',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// usuario farmaceutico. papel com bastante permissao, mas nao tudo
// (ex: nao mexe em usuarios nem em configuracoes).
export const mockPharmacistUser = {
  id: 2,
  name: 'Farmacêutico Teste',
  email: 'farmaceutico@farmacia.ufba.br',
  role: 'FARMACEUTICO' as const,
  registration: 'CRF456',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// usuario paciente. tem o menor conjunto de permissoes e so enxerga
// os proprios dados. util pra testar os bloqueios por dono.
export const mockPatientUser = {
  id: 3,
  name: 'Paciente Teste',
  email: 'paciente@gmail.com',
  role: 'PACIENTE' as const,
  registration: 'PAC789',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

// lista com os tres papeis, pra testes que consomem array
// (listagens, filtros, paginacao).
export const mockUsersList = [mockUser, mockPharmacistUser, mockPatientUser];