export const Role = {
  ADMIN: 'ADMIN',
  FARMACEUTICO: 'FARMACEUTICO',
  MEDICO: 'MEDICO',
  ALUNO: 'ALUNO',
  PACIENTE: 'PACIENTE',
} as const;

export type Role = typeof Role[keyof typeof Role];

export const AppointmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type AppointmentStatus = typeof AppointmentStatus[keyof typeof AppointmentStatus];

export const StockStatus = {
  BLOCKED: 'BLOCKED',
  CRITICAL_EXPIRATION: 'CRITICAL_EXPIRATION',
  EXPIRED: 'EXPIRED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  IN_STOCK: 'IN_STOCK',
} as const;

export type StockStatus = typeof StockStatus[keyof typeof StockStatus];

export const DosageUnit = {
  MG: 'MG',
  ML: 'ML',
  G: 'G',
  MCG: 'MCG',
  UI: 'UI',
} as const;

export type DosageUnit = typeof DosageUnit[keyof typeof DosageUnit];
