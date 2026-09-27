// paciente atendido pela farmacia escola.
// carrega os dados cadastrais (nome, cpf, cartao sus, telefone,
// nascimento, endereco) e o vinculo opcional com um usuario de
// acesso (userid, quando o paciente faz login no sistema).
// a contagem de agendamentos aparece em duas formas por
// compatibilidade com consumidores diferentes: appointmentscount
// (campo "achatado") e _count.appointments (formato do prisma).
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