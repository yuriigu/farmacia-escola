import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { PatientService } from '../services/patient-service';
import { prisma } from '../utils/prisma';
import { patientCreateSchema, patientUpdateSchema } from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de paciente.
// concentra as regras de acesso (quem pode listar, ver, criar, editar
// e excluir paciente) e delega a regra de negocio pro service.
// paciente comum so enxerga a si mesmo, a equipe (admin, farmaceutico,
// aluno e medico) enxerga a listagem inteira.
export class PatientController {
  private patientService: PatientService;

  constructor() {
    // instanciamos o service de paciente (/services/patient-service.ts),
    // que cuida da persistencia e das regras de negocio.
    this.patientService = new PatientService();
  }

  // lista pacientes. paciente comum recebe so o proprio registro,
  // a equipe recebe a lista completa com filtro de busca opcional.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // filtro de busca opcional por nome/cpf vindo da query string.
      let search = undefined;
      if (req.query.search) {
        search = req.query.search as string;
      } else {
        search = undefined;
      }

      // se for paciente, so devolvemos o cadastro dele mesmo.
      // se por acaso nao existir mais (soft delete), devolve lista vazia.
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findFirst({
          where: { userId: userId, deletedAt: null },
        });
        if (!patientRecord) {
          res.json([]);
          return;
        } else {
          res.json([patientRecord]);
          return;
        }
      }

      // checagem de quem e da equipe. so eles veem a listagem geral.
      let isStaff = false;
      if (role === 'ADMIN') {
        isStaff = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isStaff = true;
        } else {
          if (role === 'ALUNO') {
            isStaff = true;
          } else {
            if (role === 'MEDICO') {
              isStaff = true;
            } else {
              isStaff = false;
            }
          }
        }
      }

      if (!isStaff) {
        res.status(403).json({ error: 'Acesso negado para visualização da listagem de pacientes' });
        return;
      }

      // chamamos o service (/services/patient-service.ts) com os filtros.
      const patients = await this.patientService.getAll(role, userId, search);
      res.json(patients);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar pacientes' });
        return;
      }
    }
  };

  // busca um paciente pelo id. a autorizacao (paciente so ve o proprio,
  // equipe ve todos) fica toda no service, que devolve 404 ou 403.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de paciente inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de paciente inválido' });
          return;
        }
      }

      // chamamos o service (/services/patient-service.ts) passando
      // o papel e o id do usuario pra ele aplicar a autorizacao.
      const patient = await this.patientService.getById(id, role, userId);
      res.json(patient);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar dados do paciente' });
        return;
      }
    }
  };

  // cadastra um novo paciente. so admin, farmaceutico e aluno podem.
  // o cadastro tambem cria o usuario de acesso do paciente la no service.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // so a equipe de cadastro pode criar paciente.
      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        } else {
          if (role === 'ALUNO') {
            isAllowedRole = true;
          } else {
            isAllowedRole = false;
          }
        }
      }

      if (!isAllowedRole) {
        res.status(403).json({ error: 'Apenas profissionais autorizados podem cadastrar pacientes' });
        return;
      }

      // validacao do schema de criacao de paciente.
      const validationResult = patientCreateSchema.safeParse(req.body);
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

      // chamamos o service (/services/patient-service.ts) pra criar
      // o paciente e o usuario de acesso dele.
      const patient = await this.patientService.create(userId, role, validationResult.data);
      res.status(201).json(patient);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar paciente' });
        return;
      }
    }
  };

  // atualiza os dados de um paciente.
  // equipe (admin, farmaceutico, aluno) pode editar qualquer um,
  // e o proprio paciente pode editar o seu. os demais sao bloqueados.
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
        res.status(400).json({ error: 'ID de paciente inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de paciente inválido' });
          return;
        }
      }

      // confere se o paciente existe e nao foi deletado (soft delete).
      const patientRecord = await prisma.patient.findFirst({
        where: { id: id, deletedAt: null },
      });

      if (!patientRecord) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

      // regra de autorizacao: equipe edita qualquer um,
      // paciente so edita o proprio cadastro.
      let canUpdate = false;
      if (role === 'ADMIN') {
        canUpdate = true;
      } else {
        if (role === 'FARMACEUTICO') {
          canUpdate = true;
        } else {
          if (role === 'ALUNO') {
            canUpdate = true;
          } else {
            if (role === 'PACIENTE') {
              if (patientRecord.userId === userId) {
                canUpdate = true;
              } else {
                canUpdate = false;
              }
            } else {
              canUpdate = false;
            }
          }
        }
      }

      if (!canUpdate) {
        res.status(403).json({ error: 'Acesso não autorizado para modificar este paciente' });
        return;
      }

      // validacao do schema de update de paciente.
      const validationResult = patientUpdateSchema.safeParse(req.body);
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

      // chamamos o service (/services/patient-service.ts) pra aplicar o update.
      const updated = await this.patientService.update(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar paciente' });
        return;
      }
    }
  };

  // exclui um paciente (soft delete via deletedAt, preservando historico
  // de consultas e movimentacoes ligadas a ele).
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
        res.status(400).json({ error: 'ID de paciente inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de paciente inválido' });
          return;
        }
      }

      // exclusao e mais restrita que o cadastro: so admin e farmaceutico.
      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        } else {
          isAllowedRole = false;
        }
      }

      if (!isAllowedRole) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir pacientes' });
        return;
      }

      // confere se o paciente existe e esta ativo antes de excluir.
      const patientRecord = await prisma.patient.findFirst({
        where: { id: id, deletedAt: null },
      });

      if (!patientRecord) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

      // chamamos o service (/services/patient-service.ts) pra aplicar
      // o soft delete e ajustar o usuario de acesso vinculado.
      const result = await this.patientService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir paciente' });
        return;
      }
    }
  };
}