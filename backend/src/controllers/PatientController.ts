import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { PatientService } from '../services/PatientService';
import { prisma } from '../utils/Prisma';
import { patientCreateSchema, patientUpdateSchema } from '../middlewares/ValidationMiddleware';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      let search = undefined;
      if (req.query.search) {
        search = req.query.search as string;
      } else {
        search = undefined;
      }

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.json([]);
          return;
        } else {
          res.json([patientRecord]);
          return;
        }
      }

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

      const patientRecord = await prisma.patient.findUnique({
        where: { id: id },
      });

      if (!patientRecord) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

      let isAuthorized = false;
      if (role === 'ADMIN') {
        isAuthorized = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAuthorized = true;
        } else {
          if (role === 'ALUNO') {
            isAuthorized = true;
          } else {
            if (role === 'MEDICO') {
              isAuthorized = true;
            } else {
              if (role === 'PACIENTE') {
                if (patientRecord.userId === userId) {
                  isAuthorized = true;
                } else {
                  isAuthorized = false;
                }
              } else {
                isAuthorized = false;
              }
            }
          }
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Acesso não autorizado ao prontuário do paciente' });
        return;
      }

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

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

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

      const patientRecord = await prisma.patient.findUnique({
        where: { id: id },
      });

      if (!patientRecord) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

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

      const patientRecord = await prisma.patient.findUnique({
        where: { id: id },
      });

      if (!patientRecord) {
        res.status(404).json({ error: 'Paciente não encontrado' });
        return;
      }

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