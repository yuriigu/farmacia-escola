import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { MedicineService } from '../services/medicine-service';
import { medicineCreateSchema, medicineUpdateSchema } from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints do catalogo de medicamentos.
// e um crud relativamente simples: listar, buscar por id, criar,
// atualizar e excluir (soft delete, via deletedAt).
// as checagens de permissao ficam aqui, a regra de negocio fica no service.
export class MedicineController {
  private medicineService: MedicineService;

  constructor() {
    // instanciamos o service de medicamento (/services/medicine-service.ts),
    // que cuida das validacoes de negocio e da persistencia.
    this.medicineService = new MedicineService();
  }

  // lista todos os medicamentos ativos (o service ja ignora os deletados).
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // chamamos o service (/services/medicine-service.ts) pra trazer
      // a lista completa de medicamentos nao deletados.
      const medicines = await this.medicineService.getAll();
      res.json(medicines);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar medicamentos' });
        return;
      }
    }
  };

  // busca um medicamento pelo id. a checagem de existencia fica toda
  // no service, que devolve 404 se nao achar. assim a gente evita
  // fazer a mesma leitura duas vezes aqui no controller.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      // chamamos o service (/services/medicine-service.ts) direto,
      // que ja lanca erro com statusCode 404 se o medicamento nao existir.
      const medicine = await this.medicineService.getById(id);
      res.json(medicine);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar medicamento' });
        return;
      }
    }
  };

  // cadastra um novo medicamento. admin, farmaceutico e aluno podem criar.
  // valida o corpo e delega a criacao pro service.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // checagem de permissao: admin, farmaceutico e aluno podem cadastrar.
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
        res.status(403).json({ error: 'Acesso negado para cadastro de medicamentos' });
        return;
      }

      // validacao do schema de criacao de medicamento.
      const validationResult = medicineCreateSchema.safeParse(req.body);
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

      // chamamos o service (/services/medicine-service.ts) pra criar o medicamento.
      const medicine = await this.medicineService.create(userId, role, validationResult.data as any);
      res.status(201).json(medicine);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar medicamento' });
        return;
      }
    }
  };

  // atualiza um medicamento existente. admin, farmaceutico e aluno podem.
  // valida o corpo primeiro (antes de qualquer escrita no banco)
  // e deixa a checagem de existencia por conta do service.
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
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      // mesma regra do create: admin, farmaceutico e aluno podem alterar.
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
        res.status(403).json({ error: 'Acesso negado para alteração de medicamentos' });
        return;
      }

      // validamos o corpo antes de qualquer ida ao banco. se estiver invalido,
      // nem chega a gastar query. a checagem de existencia fica no service.
      const validationResult = medicineUpdateSchema.safeParse(req.body);
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

      // chamamos o service (/services/medicine-service.ts) pra aplicar o update.
      const updated = await this.medicineService.update(userId, role, id, validationResult.data as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar medicamento' });
        return;
      }
    }
  };

  // exclui um medicamento (na pratica, soft delete via deletedAt, pra
  // preservar historico de movimentacoes e consultas antigas).
  // so admin e farmaceutico podem excluir.
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
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      // exclusao de medicamento e mais restrita: so admin e farmaceutico.
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir medicamentos' });
        return;
      }

      // chamamos o service (/services/medicine-service.ts), que cuida
      // da checagem de existencia (404) e do soft delete.
      await this.medicineService.delete(userId, role, id);
      res.json({ message: 'Medicamento excluído com sucesso' });
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir medicamento' });
        return;
      }
    }
  };
}