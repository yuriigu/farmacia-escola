// src/types/enums.ts

export const Role = {
  ADMIN: 'ADMIN',
  FARMACEUTICO: 'FARMACEUTICO',
  MEDICO: 'MEDICO',
  ALUNO: 'ALUNO',
  PACIENTE: 'PACIENTE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const AppointmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];