import { ActivityLogRepository } from '../repositories/activity-log-repository';

// service de log de atividade. e a camada de regra de negocio entre
// os controllers e o repositorio. aqui ficam as decisoes de o que
// registrar, como normalizar os dados e como paginar a listagem.
export class ActivityLogService {
  private logRepo: ActivityLogRepository;

  constructor() {
    // instanciamos o repositorio (/repositories/activity-log-repository.ts),
    // que e quem fala direto com o prisma.
    this.logRepo = new ActivityLogRepository();
  }

  // registra um log de auditoria. esse metodo e pensado pra ser
  // chamado de dentro de outros fluxos (create, update, revert, etc)
  // sem quebrar a operacao principal se algo der errado.
  // por isso: se faltar dado essencial, devolve null sem lancar erro,
  // e se o insert falhar, tambem engole o erro e so loga no console.
  async log(userId: number, action: string, entity: string, entityId?: number | null, details?: string | null) {
    // sem usuario, sem acao ou sem entidade, nao tem log util.
    // devolve null em vez de estourar, pra nao derrubar quem chamou.
    if (!userId) {
      return null;
    } else {
      if (!action) {
        return null;
      } else {
        if (!entity) {
          return null;
        }
      }
    }

    // normaliza entityId: se veio numero valido, usa; senao, null.
    let resolvedEntityId = null;
    if (entityId !== undefined && entityId !== null) {
      resolvedEntityId = entityId;
    } else {
      resolvedEntityId = null;
    }

    // normaliza details com trim quando veio texto; senao, null.
    let resolvedDetails = null;
    if (details) {
      resolvedDetails = details.trim();
    } else {
      resolvedDetails = null;
    }

    try {
      // chamamos o repositorio (/repositories/activity-log-repository.ts)
      // pra gravar o log com os campos ja normalizados.
      return await this.logRepo.create({
        userId,
        action: action.trim(),
        entity: entity.trim(),
        entityId: resolvedEntityId,
        details: resolvedDetails,
      });
    } catch (err) {
      // log de auditoria nao deve quebrar o fluxo principal.
      // se falhar, so registramos no console e seguimos.
      console.error('Failed to write activity log:', err);
      return null;
    }
  }

  // lista logs com filtros e paginacao.
  // aplica limites sanos (page >= 1, limit entre 1 e 100) pra evitar
  // que alguem peca 10 mil registros de uma vez.
  async getLogs(filters: { userId?: number; entity?: string; page?: number; limit?: number }) {
    // normaliza a pagina: se nao veio ou veio invalida, assume 1.
    let pageNumber = 1;
    if (filters.page) {
      pageNumber = Number(filters.page);
    } else {
      pageNumber = 1;
    }
    const page = Math.max(1, pageNumber);

    // normaliza o limite: padrao 50, com teto de 100.
    let limitNumber = 50;
    if (filters.limit) {
      limitNumber = Number(filters.limit);
    } else {
      limitNumber = 50;
    }
    const limit = Math.min(100, Math.max(1, limitNumber));
    const skip = (page - 1) * limit;

    // filtro opcional por usuario. aceita numero valido ou undefined.
    let parsedUserId = undefined;
    if (filters.userId) {
      parsedUserId = Number(filters.userId);
    } else {
      parsedUserId = undefined;
    }

    // filtro opcional por entidade. limpa espacos nas pontas.
    let cleanEntity = undefined;
    if (filters.entity) {
      cleanEntity = filters.entity.trim();
    } else {
      cleanEntity = undefined;
    }

    // checagem final do userId: se virou NaN no parse, cai pra undefined
    // em vez de deixar um filtro invalido seguir adiante.
    let filterUserId = undefined;
    if (parsedUserId) {
      if (!isNaN(parsedUserId)) {
        filterUserId = parsedUserId;
      } else {
        filterUserId = undefined;
      }
    } else {
      filterUserId = undefined;
    }

    // chamamos o repositorio (/repositories/activity-log-repository.ts)
    // pra trazer os logs filtrados e a contagem total.
    const { logs, total } = await this.logRepo.findMany({
      userId: filterUserId,
      entity: cleanEntity,
      skip,
      take: limit,
    });

    // calcula o total de paginas. se por algum motivo der 0 ou NaN,
    // forca 1 pra resposta nao sair estranha.
    let calculatedTotalPages = Math.ceil(total / limit);
    let totalPages = 1;
    if (calculatedTotalPages) {
      totalPages = calculatedTotalPages;
    } else {
      totalPages = 1;
    }

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // busca um log pelo id. valida o id antes de tentar buscar,
  // e lanca erro com statusCode 404 quando nao encontra, pra que
  // o middleware global converta em resposta http adequada.
  async getById(id: number) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de log inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de log inválido' };
      }
    }

    // chamamos o repositorio (/repositories/activity-log-repository.ts)
    // pra buscar o log com os dados do usuario que gerou.
    const log = await this.logRepo.findById(numericId);
    if (!log) {
      throw { statusCode: 404, message: 'Log de atividade não encontrado' };
    }
    return log;
  }
}