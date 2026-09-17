// PACIENTE ATENDIDO PELA FARMACIA ESCOLA
export interface Patient {
  id: number;
  name: string;
  cpf: string;
  susCard?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
  userId?: number | null;
  appointmentsCount?: number;
  _count?: {
    appointments?: number;
  };
}