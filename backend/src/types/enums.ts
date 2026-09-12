export enum Role {
  ADMIN = 'ADMIN',
  FARMACEUTICO = 'FARMACEUTICO',
  ATENDENTE = 'ATENDENTE',
  MEDICO = 'MEDICO',
  PACIENTE = 'PACIENTE',
  ALUNO = 'ALUNO',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WithdrawalStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REVERTED = 'REVERTED',
}

export enum DisposalStatus {
  DISPOSED = 'DISPOSED',
  REVERTED = 'REVERTED',
}

export enum StockMovementType {
  ENTRY = 'ENTRY',
  WITHDRAWAL = 'WITHDRAWAL',
  DISPOSAL = 'DISPOSAL',
  REVERT = 'REVERT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum DosageUnit {
  MG = 'MG',
  ML = 'ML',
  G = 'G',
  MCG = 'MCG',
  UI = 'UI',
}

export enum StockStatus {
  BLOCKED = 'BLOCKED',
  CRITICAL_EXPIRATION = 'CRITICAL_EXPIRATION',
  EXPIRED = 'EXPIRED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  IN_STOCK = 'IN_STOCK',
}

