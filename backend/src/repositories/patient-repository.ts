import { prisma } from '../utils/prisma';

// repositorio de paciente. e a camada que fala direto com o prisma
// pra ler e gravar pacientes. o service usa essa classe pra nao
// conhecer detalhes de banco.
export class PatientRepository {
  // lista pacientes, com busca opcional por nome ou cpf e paginacao
  // opcional. o limite padrao de 100 e importante porque essa listagem
  // alimenta o autocomplete de cpf, que dispara a cada 3 digitos.
  // sem o limite, o banco varreria a tabela inteira a cada tecla digitada.
  async findAll(search?: string, pagination?: { take?: number; skip?: number }) {
    // filtro base: nunca trazer paciente deletado (soft delete).
    let where: any = {
      deletedAt: null,
    };

    // se veio termo de busca, ampliamos o filtro pra nome ou cpf
    // usando contains. o cpf aceita tanto puro quanto formatado.
    if (search) {
      where = {
        deletedAt: null,
        OR: [
          { name: { contains: search } },
          { cpf: { contains: search } },
        ],
      };
    }

    return prisma.patient.findMany({
      where: where,
      include: {
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { name: 'asc' },
      take: pagination?.take ?? 100,
      // skip so entra na query se foi passado, mantendo o default limpo.
      ...(pagination?.skip ? { skip: pagination.skip } : {}),
    });
  }

  // busca um paciente por id, ja trazendo o historico de consultas dele.
  // o limite de 50 e a ordenacao sao aplicados no banco pra nao carregar
  // historico inteiro de quem tem centenas de consultas. as projections
  // sao enxutas de proposito: em vez de trazer medicine/batch/slot
  // completos, escolhemos so os campos usados pela tela.
  async findById(id: number) {
    return prisma.patient.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, email: true } },
        appointments: {
          include: {
            slot: { select: { id: true, date: true, timeSlot: true } },
            batch: { include: { medicine: { select: { id: true, name: true, dosage: true } } } },
            dispensedByUser: { select: { id: true, name: true, role: true } },
            items: {
              include: {
                medicine: { select: { id: true, name: true, dosage: true } },
                batch: { select: { id: true, batchNumber: true, expirationDate: true } },
              },
            },
          },
          orderBy: { scheduledDate: 'desc' },
          take: 50,
        },
      },
    });
  }

  // busca paciente por cpf. e o metodo mais chatinho do repositorio,
  // porque o banco guarda cpf em formatos variados (limpo e formatado),
  // entao a gente tenta em camadas, do mais eficiente pro mais caro:
  // 1) igualdade exata (cpf e @unique, entao usa indice)
  // 2) contains (like) so se a igualdade falhar
  // 3) fallback em sql unico, normalizando o cpf no proprio banco
  // assim evitamos carregar linhas pra memoria e mantemos custo baixo.
  async findByCpf(cpf: string) {
    // normaliza removendo formatacao e monta a versao formatada
    // (123.456.789-00) pra cobrir os dois formatos usados no banco.
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.length === 11
      ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9)}`
      : cpf;
    const prismaAny = prisma as any;

    // tentativa 1: igualdade exata. como cpf e @unique, isso usa indice
    // e e o caminho mais rapido. cobre tanto o formato limpo quanto o formatado.
    const exactHit = await prismaAny.patient.findFirst({
      where: {
        OR: [{ cpf: cleanCpf }, { cpf: formattedCpf }],
        deletedAt: null,
      },
    });
    if (exactHit) {
      return exactHit;
    }

    // tentativa 2: contains. so roda aqui, no caminho excepcional,
    // porque contains nao usa indice. serve pra casar variacoes parciais.
    try {
      const likeHit = await prismaAny.patient.findFirst({
        where: {
          OR: [{ cpf: { contains: cleanCpf } }, { cpf: { contains: formattedCpf } }],
          deletedAt: null,
        },
      });
      if (likeHit) {
        return likeHit;
      }
    } catch {
      // em sqlite/libsql o contains com OR sobre a mesma coluna
      // as vezes quebra a traducao do prisma. nesse caso, caimos
      // pro fallback em sql logo abaixo.
    }

    // tentativa 3: fallback em sql unico, normalizando o cpf no banco
    // e trazendo so o id (limit 1). evita carregar linhas pra memoria.
    try {
      const rows: Array<{ id: number }> = await prismaAny.$queryRawUnsafe(
        'SELECT id FROM "Patient" WHERE deletedAt IS NULL AND REPLACE(REPLACE(REPLACE(cpf, \'.\', \'\'), \'-\', \'\'), \' \', \'\') = ? LIMIT 1',
        cleanCpf
      );
      if (rows && rows.length > 0) {
        return prismaAny.patient.findFirst({ where: { id: rows[0].id } });
      }
    } catch {
      return null;
    }
    return null;
  }

  // busca o cadastro de paciente associado a um usuario do sistema.
  // usado quando o usuario logado e paciente e a gente precisa do id
  // do cadastro dele pra amarrar consultas.
  async findByUserId(userId: number) {
    return prisma.patient.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });
  }

  // cria um novo paciente. userId e opcional porque, no cadastro publico,
  // o usuario e criado junto e o id pode ser atribuido depois.
  async create(data: {
    name: string;
    cpf: string;
    phone?: string | null;
    birthDate?: Date | null;
    address?: string | null;
    userId?: number | null;
  }) {
    return prisma.patient.create({
      data,
    });
  }

  // atualiza os dados cadastrais do paciente.
  async update(
    id: number,
    data: {
      name?: string;
      cpf?: string;
      phone?: string | null;
      birthDate?: Date | null;
      address?: string | null;
    }
  ) {
    return prisma.patient.update({
      where: { id: id },
      data: data,
    });
  }

  // exclusao logica (soft delete): em vez de apagar a linha, marca
  // deletedAt com a data atual. assim preservamos historico de
  // consultas e movimentacoes ligadas ao paciente.
  async delete(id: number) {
    return prisma.patient.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}