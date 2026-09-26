import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { AppointmentService } from '../services/appointment-service';
import { prisma } from '../utils/prisma';
import {
  appointmentCreateSchema,
  appointmentDispenseSchema,
  appointmentRevertDispenseSchema,
  appointmentUpdateSchema,
  appointmentUpdateStatusSchema,
} from '../middlewares/validation-middleware';

// controller que expõe os endpoints de agendamento (consulta).
// ele concentra a validacao de entrada, checagens de permissao por papel
// e delega a regra de negocio pro service, que fala com o banco.
export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    // instanciamos o service de agendamento (/services/appointment-service.ts),
    // que e quem realmente executa as regras de criacao, atualizacao e dispensa.
    this.appointmentService = new AppointmentService();
  }

  // lista os agendamentos de acordo com o papel do usuario logado.
  // paciente ve so os dele, admin/farmaceutico/aluno veem tudo.
  // a checagem usa o req.user que ja veio resolvido pelo auth-middleware,
  // evitando consultas extras ao banco so pra descobrir o patientId.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      let patientId: number | undefined = undefined;

      // se for paciente, filtramos pelo patientId que veio junto com o token.
      // se por algum motivo ele nao tiver patientId, devolvemos lista vazia
      // em vez de estourar erro.
      if (role === 'PACIENTE') {
        if (!req.user.patientId) {
          res.json([]);
          return;
        }
        patientId = req.user.patientId;
      }

      // chamamos o service (/services/appointment-service.ts) passando
      // o papel, o id do usuario e o patientId opcional. ele aplica
      // os filtros corretos e devolve a lista.
      const appointments = await this.appointmentService.getAll(role, userId, patientId);
      res.json(appointments);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        return;
      }
    }
  };

  // busca um agendamento pelo id. a checagem de existencia e de permissao
  // fica toda no service, que devolve 404 ou 403 conforme o caso.
  // assim evitamos consultas duplicadas aqui no controller.
  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      // aqui chamamos o service (/services/appointment-service.ts) passando
      // o req.user inteiro pra ele aplicar a autorizacao (paciente so ve o proprio).
      const appointment = await this.appointmentService.getById(id, req.user);
      res.json(appointment);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar agendamento' });
        return;
      }
    }
  };

  // cria um novo agendamento. valida o corpo com o schema zod,
  // e se quem esta criando for paciente, injeta os dados do proprio
  // paciente no payload (pra ele nao agendar em nome de outro).
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      // validacao com o schema zod vindo do validation-middleware.
      // se falhar, devolvemos a primeira mensagem e a lista de issues.
      const validationResult = appointmentCreateSchema.safeParse(req.body);
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

      const payload = { ...validationResult.data };

      // se for paciente criando, buscamos o cadastro dele no banco
      // (via prisma em /utils/prisma.ts) pra amarrar o agendamento ao proprio perfil.
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });

        if (!patientRecord) {
          res.status(400).json({ error: 'Perfil de paciente não encontrado para este usuário' });
          return;
        } else {
          payload.patientId = patientRecord.id;
          payload.patientName = patientRecord.name;
          payload.patientCpf = patientRecord.cpf;
        }
      }

      // chamamos o service (/services/appointment-service.ts) pra criar de fato,
      // passando o usuario logado e o payload ja preparado.
      const appointment = await this.appointmentService.create(req.user, payload);
      res.status(201).json(appointment);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao criar agendamento' });
        return;
      }
    }
  };

  // atualiza um agendamento existente. valida o corpo, checa permissoes
  // (paciente so mexe no proprio) e valida a transicao de status
  // antes de mandar pro service.
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
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      // busca o agendamento no banco (via prisma em /utils/prisma.ts)
      // pra comparar o status atual e checar de quem ele e.
      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      // se for paciente, garantimos que ele so mexe no agendamento dele.
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

      const currentStatus = appointmentRecord.status;

      // validacao do corpo do update com o schema zod do validation-middleware.
      const validationResult = appointmentUpdateSchema.safeParse(req.body);
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

      // regra de negocio: agendamento cancelado ainda pode ser re-concluido,
      // mas agendamento ja concluido so aceita update se o alvo tambem for
      // concluido (no-op). assim a gente evita reabrir um atendimento fechado.
      if (currentStatus === 'CANCELLED') {
        // cancelado pode voltar pra concluido se precisar, entao deixa passar.
      } else if (currentStatus === 'COMPLETED') {
        // ja finalizado: so aceita se o alvo tambem for completed (no-op),
        // qualquer outra mudanca e bloqueada.
        if (validationResult.data.status && validationResult.data.status.toUpperCase() !== 'COMPLETED') {
          res.status(400).json({ error: 'Agendamento já finalizado não pode ter seus dados ou status modificados' });
          return;
        }
      }

      // validacao das transicoes de status permitidas, dependendo do status atual.
      if (validationResult.data.status) {
        const targetStatus = validationResult.data.status.toUpperCase();
        if (currentStatus !== targetStatus) {
          if (currentStatus === 'PENDING') {
            let isValid = false;
            if (targetStatus === 'CONFIRMED') {
              isValid = true;
            } else {
              if (targetStatus === 'CANCELLED') {
                isValid = true;
              } else {
                if (targetStatus === 'COMPLETED') {
                  isValid = true;
                } else {
                  isValid = false;
                }
              }
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ser confirmado, concluído ou cancelado' });
              return;
            }
          } else {
            if (currentStatus === 'CONFIRMED') {
              let isValid = false;
              if (targetStatus === 'COMPLETED') {
                isValid = true;
              } else {
                if (targetStatus === 'CANCELLED') {
                  isValid = true;
                } else {
                  isValid = false;
                }
              }
              if (!isValid) {
                res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ser finalizado ou cancelado' });
                return;
              }
            }
          }
        }

        // paciente so pode cancelar, nao pode confirmar nem concluir.
        if (role === 'PACIENTE') {
          if (targetStatus !== 'CANCELLED') {
            res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
            return;
          }
        }
      }

      // chamamos o service (/services/appointment-service.ts) pra aplicar
      // o update de verdade, ja com as validacoes acima garantidas.
      const updated = await this.appointmentService.update(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar agendamento' });
        return;
      }
    }
  };

  // atualiza so o status do agendamento. e um endpoint mais enxuto que o update,
  // pensado pra acoes rapidas (confirmar, cancelar, concluir) e que tambem
  // aceita a selecao de lotes quando o alvo e completed.
  updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      // busca o agendamento pra saber o status atual e de quem ele e.
      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      // paciente so pode agir no proprio agendamento.
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

      // validacao do schema especifico de update de status.
      const validationResult = appointmentUpdateStatusSchema.safeParse(req.body);
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

      const currentStatus = appointmentRecord.status;
      const targetStatus = validationResult.data.status.toUpperCase();

      // agendamento cancelado so pode ir pra completed (re-conclusao).
      // qualquer outro destino a partir daqui e bloqueado.
      if (currentStatus === 'CANCELLED') {
        if (targetStatus !== 'COMPLETED') {
          res.status(400).json({ error: 'Transição inválida: um agendamento cancelado só pode ser re-concluído' });
          return;
        }
      }

      // validacao das transicoes permitidas conforme o status atual.
      if (currentStatus !== targetStatus) {
        if (currentStatus === 'PENDING') {
          let isValid = false;
          if (targetStatus === 'CONFIRMED') {
            isValid = true;
          } else {
            if (targetStatus === 'CANCELLED') {
              isValid = true;
            } else {
              if (targetStatus === 'COMPLETED') {
                isValid = true;
              } else {
                isValid = false;
              }
            }
          }
          if (!isValid) {
            res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ir para confirmado, concluído ou cancelado' });
            return;
          }
        } else {
          if (currentStatus === 'CONFIRMED') {
            let isValid = false;
            if (targetStatus === 'COMPLETED') {
              isValid = true;
            } else {
              if (targetStatus === 'CANCELLED') {
                isValid = true;
              } else {
                isValid = false;
              }
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ir para finalizado ou cancelado' });
              return;
            }
          } else {
            // qualquer outro status inesperado so pode ir pra completed.
            let isValid = false;
            if (targetStatus === 'COMPLETED') {
              isValid = true;
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição inválida a partir do status atual' });
              return;
            }
          }
        }
      }

      // paciente continua so podendo cancelar.
      if (role === 'PACIENTE') {
        if (targetStatus !== 'CANCELLED') {
          res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
          return;
        }
      }

      // se o corpo tambem trouxe selecao de lotes (schema de dispensa),
      // extraimos aqui pra passar pro service junto com a mudanca de status.
      const dispenseParsed = appointmentDispenseSchema.safeParse(req.body);
      let batchSelections: Array<{ medicineId: number; batchId: number; quantity: number }> | undefined = undefined;
      if (dispenseParsed.success && dispenseParsed.data.batchSelections) {
        batchSelections = dispenseParsed.data.batchSelections;
      }

      // chamamos o service (/services/appointment-service.ts) pra aplicar
      // a transicao de status e, se for o caso, ja dar baixa nos lotes.
      const updated = await this.appointmentService.updateStatus(
        userId,
        role,
        id,
        targetStatus,
        validationResult.data.notes,
        batchSelections
      );

      res.json(updated);
      return;
    } catch (err: any) {
      console.error('Erro ao atualizar status do agendamento:', err);
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar status do agendamento' });
        return;
      }
    }
  };

  // endpoint dedicado a dispensacao (entrega de medicamento).
  // e um atalho que sempre leva o agendamento pra completed,
  // validando o corpo e checando o papel de quem esta dispensando.
  dispense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nao autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: 'ID de agendamento invalido' });
        return;
      }

      // so admin, farmaceutico e aluno podem dispensar.
      const allowed = role === 'ADMIN' || role === 'FARMACEUTICO' || role === 'ALUNO';
      if (!allowed) {
        res.status(403).json({ error: 'Acesso negado para este perfil de usuario' });
        return;
      }

      // valida o corpo com o schema de dispensa (batchSelections e notes).
      const parsed = appointmentDispenseSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        res.status(400).json({ error: first ? first.message : 'Dados invalidos na requisicao', details: parsed.error.issues });
        return;
      }

      // reaproveitamos o updateStatus do service (/services/appointment-service.ts)
      // forcando o alvo pra completed e passando as selecoes de lote.
      const result = await this.appointmentService.updateStatus(
        userId,
        role,
        id,
        'COMPLETED',
        parsed.data.notes,
        parsed.data.batchSelections
      );
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao dispensar agendamento' });
        return;
      }
    }
  };

  // estorna (desfaz) uma dispensacao ja feita, devolvendo os itens pro estoque.
  // exige um motivo, validado pelo schema de estorno.
  revertDispense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nao autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: 'ID de agendamento invalido' });
        return;
      }

      // valida o corpo com o schema de estorno (reason).
      const parsed = appointmentRevertDispenseSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        res.status(400).json({ error: first ? first.message : 'Dados invalidos na requisicao', details: parsed.error.issues });
        return;
      }

      // chama o service (/services/appointment-service.ts) pra reverter
      // a dispensacao e devolver os lotes ao estoque.
      const result = await this.appointmentService.revertDispense(userId, role, id, parsed.data.reason);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao estornar dispensacao' });
        return;
      }
    }
  };

  // remove/cancela um agendamento. faz a checagem de dono pro paciente
  // e delega a exclusao pro service, que aplica as regras restantes.
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
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      // confere se o agendamento existe antes de tentar apagar.
      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      // paciente so pode apagar/cancelar o proprio agendamento.
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

      // chama o service (/services/appointment-service.ts) pra excluir/cancelar.
      const result = await this.appointmentService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cancelar/excluir agendamento' });
        return;
      }
    }
  };
}