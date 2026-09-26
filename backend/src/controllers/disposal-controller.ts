import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { DisposalService } from '../services/disposal-service';
import { prisma } from '../utils/prisma';
import { disposalCreateSchema, disposalReversalSchema, disposalUpdateSchema } from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de descarte de lote.
// cuida do registro, atualizacao, exclusao e reversao de descartes.
// como descarte mexe em estoque e em rastreabilidade sanitaria,
// quase tudo aqui e restrito a admin e farmaceutico, e a reversao
// sempre exige um motivo pra ficar registrado.
export class DisposalController {
  private disposalService: DisposalService;

  constructor() {
    // instanciamos o service de descarte (/services/disposal-service.ts),
    // que e quem realmente altera o saldo do lote e registra a movimentacao.
    this.disposalService = new DisposalService();
  }

  // lista todos os descartes registrados. serve pro historico e pra auditoria.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // chamamos o service (/services/disposal-service.ts) pra trazer
      // a lista ja com os relacionamentos de lote e usuario.
      const disposals = await this.disposalService.getAll();
      res.json(disposals);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar descartes' });
        return;
      }
    }
  };

  // busca um descarte pelo id. faz uma checagem rapida no prisma
  // pra devolver 404 cedo, depois chama o service pra montar a resposta.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de descarte inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de descarte inválido' });
          return;
        }
      }

      // consulta direta no prisma (/utils/prisma.ts) so pra confirmar
      // que o descarte existe. evita chamar o service a toa.
      const disposalRecord = await prisma.disposal.findUnique({
        where: { id: id },
      });

      if (!disposalRecord) {
        res.status(404).json({ error: 'Descarte não encontrado' });
        return;
      }

      // aqui chamamos o service (/services/disposal-service.ts)
      // pra trazer o descarte no formato de resposta.
      const disposal = await this.disposalService.getById(id);
      res.json(disposal);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar descarte' });
        return;
      }
    }
  };

  // registra um novo descarte de lote. so admin e farmaceutico podem.
  // valida o corpo e delega a regra de negocio (baixa no estoque
  // e registro de movimentacao) pro service.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // descarte e acao sensivel: so admin e farmaceutico podem registrar.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem registrar descartes' });
        return;
      }

      // validacao do schema de criacao de descarte.
      const validationResult = disposalCreateSchema.safeParse(req.body);
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

      // chamamos o service (/services/disposal-service.ts) pra registrar
      // o descarte e dar baixa no lote.
      const disposal = await this.disposalService.create(userId, role, validationResult.data);
      res.status(201).json(disposal);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao registrar descarte' });
        return;
      }
    }
  };

  // atualiza os dados de um descarte ja registrado (motivo, observacoes, etc).
  // so admin e farmaceutico podem, e o descarte precisa existir.
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
        res.status(400).json({ error: 'ID de descarte inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de descarte inválido' });
          return;
        }
      }

      // mesma regra de permissao: so admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem atualizar descartes' });
        return;
      }

      // confere se o descarte existe antes de tentar atualizar.
      const disposalRecord = await prisma.disposal.findUnique({
        where: { id: id },
      });

      if (!disposalRecord) {
        res.status(404).json({ error: 'Descarte não encontrado' });
        return;
      }

      // validacao do schema de update de descarte.
      const validationResult = disposalUpdateSchema.safeParse(req.body);
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

      // chamamos o service (/services/disposal-service.ts) pra persistir as mudancas.
      const updated = await this.disposalService.update(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar descarte' });
        return;
      }
    }
  };

  // exclui um registro de descarte. so admin e farmaceutico podem.
  // a exclusao e pensada mais como correcao de lancamento errado,
  // por isso o service decide se da pra apagar de fato ou nao.
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
        res.status(400).json({ error: 'ID de descarte inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de descarte inválido' });
          return;
        }
      }

      // exclusao de descarte tambem e restrita.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir descartes' });
        return;
      }

      // confere se o descarte existe antes de tentar excluir.
      const disposalRecord = await prisma.disposal.findUnique({
        where: { id: id },
      });

      if (!disposalRecord) {
        res.status(404).json({ error: 'Descarte não encontrado' });
        return;
      }

      // chamamos o service (/services/disposal-service.ts) pra aplicar a exclusao.
      const result = await this.disposalService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir descarte' });
        return;
      }
    }
  };

  // reverte um descarte, devolvendo a quantidade ao lote de origem.
  // e uma acao sensivel porque mexe de novo no estoque, entao o motivo
  // da reversao e obrigatorio e fica registrado.
  revert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de descarte inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de descarte inválido' });
          return;
        }
      }

      // reversao so pra admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem reverter descartes' });
        return;
      }

      // confere se o descarte existe antes de tentar reverter.
      const disposalRecord = await prisma.disposal.findUnique({
        where: { id: id },
      });

      if (!disposalRecord) {
        res.status(404).json({ error: 'Descarte não encontrado' });
        return;
      }

      // validacao do schema de reversao. o motivo e obrigatorio,
      // entao se faltar, ja devolvemos 400 com mensagem clara.
      const validationResult = disposalReversalSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({ error: 'O motivo da reversão é obrigatório', details: validationResult.error.issues });
        return;
      }

      // chamamos o service (/services/disposal-service.ts) pra reverter
      // o descarte e devolver a quantidade ao lote.
      const reverted = await this.disposalService.revert(userId, role, id, validationResult.data.revertReason);
      res.json(reverted);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao reverter descarte' });
        return;
      }
    }
  };
}