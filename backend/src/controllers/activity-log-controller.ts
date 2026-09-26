import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { ActivityLogService } from '../services/activity-log-service';
import { prisma } from '../utils/prisma';

// controller responsavel por expor os endpoints de logs de auditoria.
// existe para centralizar as regras de acesso (so admin e farmaceutico)
// e delegar a busca dos dados para o service.
export class ActivityLogController {
  private logService: ActivityLogService;

  constructor() {
    // aqui instanciamos o service que fala com o banco,
    // mantendo o controller so com a responsabilidade de http.
    this.logService = new ActivityLogService();
  }

  // lista os logs de auditoria com filtros opcionais de usuario,
  // entidade e paginacao. so admin e farmaceutico podem ver.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // se nao veio usuario no request, o middleware de auth nao autenticou.
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      // checagem de permissao: admin e farmaceutico passam, o resto nao.
      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          isAllowed = false;
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem acessar logs de auditoria' });
        return;
      }

      // filtro opcional por usuario. se nao vier na query, fica undefined
      // e o service traz de todos.
      let userId = undefined;
      if (req.query.userId) {
        userId = Number(req.query.userId);
      } else {
        userId = undefined;
      }

      // filtro opcional por entidade (user, patient, medicine, etc).
      let entity = undefined;
      if (req.query.entity) {
        entity = req.query.entity as string;
      } else {
        entity = undefined;
      }

      // paginacao com valores padrao. page comeca em 1.
      let page = 1;
      if (req.query.page) {
        page = Number(req.query.page);
      } else {
        page = 1;
      }

      // limite padrao de 50 registros por pagina.
      let limit = 50;
      if (req.query.limit) {
        limit = Number(req.query.limit);
      } else {
        limit = 50;
      }

      // aqui chamamos o service de logs (/services/activity-log-service.ts)
      // passando os filtros montados acima. ele devolve os dados paginados.
      const result = await this.logService.getLogs({
        userId,
        entity,
        page,
        limit,
      });

      res.json(result);
      return;
    } catch (err: any) {
      // se o service lancou um erro com statusCode, repassamos.
      // senao, cai no 500 generico.
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
        return;
      }
    }
  };

  // busca um log especifico pelo id. mesma regra de acesso do getAll,
  // so admin e farmaceutico.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      // mesma checagem de permissao do metodo acima.
      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          isAllowed = false;
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem acessar logs de auditoria' });
        return;
      }

      // valida o id vindo da rota. precisa existir e ser numero.
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de log inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de log inválido' });
          return;
        }
      }

      // consulta direta no prisma (/utils/prisma.ts) so para checar
      // se o log existe antes de chamar o service. evita erro 500
      // quando o id nao bate com nada.
      const logRecord = await prisma.activityLog.findUnique({
        where: { id: id },
      });

      if (!logRecord) {
        res.status(404).json({ error: 'Log de atividade não encontrado' });
        return;
      }

      // aqui chamamos o service (/services/activity-log-service.ts)
      // para trazer o log ja tratado no formato de resposta.
      const log = await this.logService.getById(id);
      res.json(log);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar log de atividade' });
        return;
      }
    }
  };
}