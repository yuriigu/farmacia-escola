import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { BatchService } from '../services/batch-service';
import { prisma } from '../utils/prisma';
import {
  batchCreateSchema,
  batchUpdateSchema,
  batchBlockSchema,
  batchAdjustmentSchema,
} from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de lote de estoque.
// concentra as checagens de papel (quem pode criar, editar, ajustar,
// bloquear e excluir lote) e delega a regra de negocio pro service,
// que e quem realmente escreve no banco e registra as movimentacoes.
export class BatchController {
  private batchService: BatchService;

  constructor() {
    // instanciamos o service de lote (/services/batch-service.ts),
    // que cuida das regras de negocio e do historico de movimentacoes.
    this.batchService = new BatchService();
  }

  // lista os lotes. aceita filtro opcional por medicamento via query string.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // filtro opcional por medicamento. se nao vier na query, undefined
      // e o service devolve todos os lotes.
      let medicineId = undefined;
      if (req.query.medicineId) {
        medicineId = Number(req.query.medicineId);
      } else {
        medicineId = undefined;
      }

      // chamamos o service (/services/batch-service.ts) pra trazer a lista
      // ja com os dados do medicamento associado.
      const batches = await this.batchService.getAll(medicineId);
      res.json(batches);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lotes' });
        return;
      }
    }
  };

  // busca um lote pelo id. faz uma checagem rapida de existencia no prisma
  // pra devolver 404 cedo, e depois chama o service pra montar a resposta.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      // consulta direta no prisma (/utils/prisma.ts) so pra confirmar
      // que o lote existe. evita chamar o service a toa e devolver 500.
      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      // aqui chamamos o service (/services/batch-service.ts) pra trazer
      // o lote ja no formato de resposta com os relacionamentos.
      const batch = await this.batchService.getById(id);
      res.json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lote' });
        return;
      }
    }
  };

  // cria um novo lote. so admin, farmaceutico e aluno podem criar.
  // confere se o medicamento existe e esta ativo antes de criar.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // checagem de permissao: admin, farmaceutico e aluno podem criar lote.
      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          if (role === 'ALUNO') {
            isAllowed = true;
          } else {
            isAllowed = false;
          }
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Acesso negado para criação de lotes' });
        return;
      }

      // validacao do schema de criacao de lote (batchCreateSchema).
      const validationResult = batchCreateSchema.safeParse(req.body);
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

      // confere se o medicamento existe e nao esta deletado (soft delete).
      // se nao achar, nem chega no service.
      const medicineRecord = await prisma.medicine.findFirst({
        where: { id: validationResult.data.medicineId, deletedAt: null },
      });

      if (!medicineRecord) {
        res.status(404).json({ error: 'Medicamento não encontrado' });
        return;
      }

      // chamamos o service (/services/batch-service.ts) pra criar o lote
      // e registrar a movimentacao de entrada inicial.
      const batch = await this.batchService.create(userId, role, validationResult.data as any);
      res.status(201).json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar lote' });
        return;
      }
    }
  };

  // atualiza os dados cadastrais do lote (numero, validade, fornecedor, etc).
  // nao permite mexer no saldo direto, isso tem endpoint proprio auditado.
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
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      // checagem de permissao: admin, farmaceutico e aluno podem alterar.
      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          if (role === 'ALUNO') {
            isAllowed = true;
          } else {
            isAllowed = false;
          }
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Acesso negado para alteração de lotes' });
        return;
      }

      // confere se o lote existe antes de tentar atualizar.
      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      // trava de seguranca: saldo do lote nao muda por aqui.
      // quem quiser corrigir estoque tem que usar o endpoint de ajustes,
      // que gera log de auditoria. isso evita alteracao silenciosa.
      if (req.body.currentQuantity !== undefined) {
        res.status(400).json({
          error: 'Alteração direta de saldo não é permitida. Para correções de estoque, utilize o endpoint auditado /api/batches/:id/adjustments',
        });
        return;
      }

      // validacao do schema de update de lote.
      const validationResult = batchUpdateSchema.safeParse(req.body);
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

      // chamamos o service (/services/batch-service.ts) pra persistir as mudancas.
      const updated = await this.batchService.update(userId, role, id, validationResult.data as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar lote' });
        return;
      }
    }
  };

  // endpoint auditado de ajuste de estoque. serve pra corrigir o saldo
  // de um lote de forma rastreavel, registrando quem ajustou e por que.
  adjust = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      // ajuste de estoque e acao sensivel: so admin e farmaceutico podem.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem realizar ajustes de estoque' });
        return;
      }

      // confere se o lote existe antes de tentar ajustar.
      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      // validacao do schema de ajuste (quantidade e motivo).
      const validationResult = batchAdjustmentSchema.safeParse(req.body);
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

      // chamamos o service (/services/batch-service.ts) pra aplicar o ajuste
      // e registrar a movimentacao do tipo ajuste no historico do lote.
      const updated = await this.batchService.adjustStock(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao ajustar estoque do lote' });
        return;
      }
    }
  };

  // alterna o bloqueio sanitario de um lote (bloqueado / liberado).
  // e uma acao sensivel, restrita a admin e farmaceutico, e sempre
  // exige um motivo quando esta bloqueando.
  toggleBlock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      // bloqueio sanitario e acao critica: so admin e farmaceutico podem.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem alterar o bloqueio sanitário' });
        return;
      }

      // confere se o lote existe antes de mexer no bloqueio.
      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      // validacao do schema de bloqueio (motivo obrigatorio quando bloqueia).
      const validationResult = batchBlockSchema.safeParse(req.body);
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

      // chamamos o service (/services/batch-service.ts) pra atualizar o
      // status de bloqueio e registrar a movimentacao correspondente.
      const updated = await this.batchService.setBlockStatus(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao alterar bloqueio sanitário do lote' });
        return;
      }
    }
  };

  // exclui um lote. acao restrita a admin e farmaceutico,
  // e o service decide se e exclusao real ou logica dependendo
  // do historico ligado ao lote.
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
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      // exclusao de lote so pra admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir lotes' });
        return;
      }

      // confere se o lote existe antes de tentar excluir.
      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      // chamamos o service (/services/batch-service.ts) pra aplicar a exclusao,
      // respeitando as regras de negocio do estoque.
      const result = await this.batchService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir lote' });
        return;
      }
    }
  };
}