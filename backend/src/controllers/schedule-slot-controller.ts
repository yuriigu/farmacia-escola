import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { ScheduleSlotService } from '../services/schedule-slot-service';
import { prisma } from '../utils/prisma';
import { scheduleSlotCreateSchema, scheduleSlotUpdateSchema } from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de escala (slot de agenda).
// escala aqui e a janela de atendimento com data, horario e capacidade,
// usada pra organizar quem atende em cada periodo.
// criar, editar e remover escala e restrito a admin e farmaceutico;
// a listagem pode ser vista por quem estiver autenticado.
export class ScheduleSlotController {
  private slotService: ScheduleSlotService;

  constructor() {
    // instanciamos o service de escala (/services/schedule-slot-service.ts),
    // que cuida das regras de negocio e da persistencia.
    this.slotService = new ScheduleSlotService();
  }

  // lista as escalas. aceita filtro opcional de intervalo de datas
  // via query string (startDate e endDate), usado pra montar a agenda.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // filtro opcional de data inicial. se nao vier, fica undefined
      // e o service traz desde o comeco.
      let startDate = undefined;
      if (req.query.startDate) {
        startDate = req.query.startDate as string;
      } else {
        startDate = undefined;
      }

      // filtro opcional de data final. sem ele, o service traz ate o fim.
      let endDate = undefined;
      if (req.query.endDate) {
        endDate = req.query.endDate as string;
      } else {
        endDate = undefined;
      }

      // chamamos o service (/services/schedule-slot-service.ts) com os filtros
      // de data pra montar a lista de escalas.
      const slots = await this.slotService.getAll(startDate, endDate);
      res.json(slots);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar escalas' });
        return;
      }
    }
  };

  // busca uma escala pelo id. faz uma checagem rapida no prisma
  // pra devolver 404 cedo, depois chama o service pra montar a resposta.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de escala inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de escala inválido' });
          return;
        }
      }

      // consulta direta no prisma (/utils/prisma.ts) so pra confirmar
      // que a escala existe. evita chamar o service a toa.
      const slotRecord = await prisma.scheduleSlot.findUnique({
        where: { id: id },
      });

      if (!slotRecord) {
        res.status(404).json({ error: 'Horário de escala não encontrado' });
        return;
      }

      // chamamos o service (/services/schedule-slot-service.ts) pra trazer
      // a escala ja com os relacionamentos.
      const slot = await this.slotService.getById(id);
      res.json(slot);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar escala' });
        return;
      }
    }
  };

  // cria uma nova escala. so admin e farmaceutico podem.
  // valida o corpo e delega a criacao pro service.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // criacao de escala e acao de gestao: so admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem criar escalas' });
        return;
      }

      // validacao do schema de criacao de escala.
      const validationResult = scheduleSlotCreateSchema.safeParse(req.body);
      if (!validationResult.success) {
        let errorMsg = 'Dados inválidos na requisição';
        if (validationResult.error) {
          if (validationResult.error.issues) {
            if (validationResult.error.issues.length > 0) {
              const firstIssue = validationResult.error.issues[0];
              if (firstIssue) {
                if (firstIssue.message) {
                  errorMsg = firstIssue.message;
                }
              }
            }
          }
        }
        res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
        return;
      }

      // chamamos o service (/services/schedule-slot-service.ts) pra criar a escala.
      const slot = await this.slotService.create(userId, role, validationResult.data as any);
      res.status(201).json(slot);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao criar escala' });
        return;
      }
    }
  };

  // atualiza uma escala existente. so admin e farmaceutico podem.
  // confere existencia antes e valida o corpo antes de chamar o service.
  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de escala inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de escala inválido' });
          return;
        }
      }

      // mesma regra do create: so admin e farmaceutico podem alterar.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem atualizar escalas' });
        return;
      }

      // confere se a escala existe antes de tentar atualizar.
      const slotRecord = await prisma.scheduleSlot.findUnique({
        where: { id: id },
      });

      if (!slotRecord) {
        res.status(404).json({ error: 'Horário de escala não encontrado' });
        return;
      }

      // validacao do schema de update de escala.
      const validationResult = scheduleSlotUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        let errorMsg = 'Dados inválidos na requisição';
        if (validationResult.error) {
          if (validationResult.error.issues) {
            if (validationResult.error.issues.length > 0) {
              const firstIssue = validationResult.error.issues[0];
              if (firstIssue) {
                if (firstIssue.message) {
                  errorMsg = firstIssue.message;
                }
              }
            }
          }
        }
        res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
        return;
      }

      // chamamos o service (/services/schedule-slot-service.ts) pra aplicar o update.
      const updated = await this.slotService.update(userId, role, id, validationResult.data as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar escala' });
        return;
      }
    }
  };

  // remove uma escala. so admin e farmaceutico podem.
  // o service decide se da pra apagar de fato ou se precisa bloquear
  // por ter consultas vinculadas.
  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de escala inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de escala inválido' });
          return;
        }
      }

      // remocao de escala tambem e restrita a admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem remover escalas' });
        return;
      }

      // confere se a escala existe antes de tentar remover.
      const slotRecord = await prisma.scheduleSlot.findUnique({
        where: { id: id },
      });

      if (!slotRecord) {
        res.status(404).json({ error: 'Horário de escala não encontrado' });
        return;
      }

      // chamamos o service (/services/schedule-slot-service.ts) pra aplicar a remocao.
      const result = await this.slotService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao remover escala' });
        return;
      }
    }
  };
}