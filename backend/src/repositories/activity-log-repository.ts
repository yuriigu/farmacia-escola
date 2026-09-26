import { prisma } from '../utils/prisma';

// dto de entrada do repositorio de log de atividade.
// basicamente descreve o que precisa ser gravado em cada log:
// quem fez (userId), o que fez (action), em qual entidade (entity),
// qual id dessa entidade (entityId) e detalhes extras (details).
export interface CreateActivityLogDTO {
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
}

// repositorio de log de atividade. e a camada que fala direto com o
// prisma pra gravar e ler logs de auditoria. o service usa essa classe
// pra nao precisar conhecer detalhes do banco.
export class ActivityLogRepository {
  // grava um novo log de atividade. aqui a gente troca undefined por null
  // nos campos opcionais, porque o prisma lida melhor assim (deixa
  // explicito que o campo foi pensado pra ser nulo).
  async create(data: CreateActivityLogDTO) {
    return prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        details: data.details ?? null,
      },
    });
  }

  // lista logs com filtros opcionais e paginacao.
  // sempre traz junto os dados basicos do usuario que gerou o log,
  // pra tela de auditoria nao precisar de uma segunda consulta.
  async findMany(filters: { userId?: number; entity?: string; skip?: number; take?: number }) {
    // monta o where so com os filtros que vieram de fato.
    // se userId ou entity nao foram passados, nao entram na query.
    const where: Record<string, unknown> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;

    // roda a busca e a contagem em paralelo, porque uma nao depende da
    // outra. economiza um round-trip e acelera a resposta.
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  }

  // busca um log especifico pelo id, tambem trazendo os dados do usuario
  // que gerou. se nao existir, devolve null e quem chamou decide o que fazer.
  async findById(id: number) {
    return prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });
  }
}