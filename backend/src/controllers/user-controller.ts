import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { UserService } from '../services/user-service';
import { prisma } from '../utils/prisma';
import {
  userCreateSchema,
  userUpdateSchema,
  userToggleActiveSchema,
} from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de usuario do sistema.
// aqui mora a gestao de contas: listar, ver, criar, editar, excluir
// e ativar/desativar usuarios.
// as regras de acesso sao bem diferentes por papel: admin faz tudo,
// a equipe assistencial (farmaceutico, medico, aluno) so mexe em paciente,
// e usuario comum so enxerga e edita a si mesmo.
export class UserController {
  private userService: UserService;

  constructor() {
    // instanciamos o service de usuario (/services/user-service.ts),
    // que cuida da persistencia, hash de senha e regras de negocio.
    this.userService = new UserService();
  }

  // lista usuarios do sistema. admin ve todos, equipe assistencial
  // so ve os pacientes, e demais papeis sao bloqueados.
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      // se nao for admin, a regra muda: equipe assistencial so ve pacientes.
      if (role !== 'ADMIN') {
        if (role === 'FARMACEUTICO') {
          // aqui chamamos o service (/services/user-service.ts) pra trazer
          // todos e filtramos no controller pra devolver so os pacientes.
          const allUsers = await this.userService.getAllUsers();
          const patientUsers = allUsers.filter((u) => {
            if (u.role === 'PACIENTE') {
              return true;
            }
            return false;
          });
          res.json(patientUsers);
          return;
        } else {
          if (role === 'MEDICO') {
            // mesmo filtro pra medico: so os pacientes.
            const allUsers = await this.userService.getAllUsers();
            const patientUsers = allUsers.filter((u) => {
              if (u.role === 'PACIENTE') {
                return true;
              }
              return false;
            });
            res.json(patientUsers);
            return;
          } else {
            if (role === 'ALUNO') {
              // e o mesmo pro aluno tambem.
              const allUsers = await this.userService.getAllUsers();
              const patientUsers = allUsers.filter((u) => {
                if (u.role === 'PACIENTE') {
                  return true;
                }
                return false;
              });
              res.json(patientUsers);
              return;
            } else {
              // qualquer outro papel (paciente, por exemplo) nao lista usuarios.
              res.status(403).json({ error: 'Apenas administradores podem listar usuários do sistema' });
              return;
            }
          }
        }
      }

      // admin cai aqui e ve a lista completa, sem filtro.
      const users = await this.userService.getAllUsers();
      res.json(users);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
        return;
      }
    }
  };

  // busca um usuario pelo id. admin pode ver qualquer um,
  // qualquer outro papel so ve a si mesmo.
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
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      // so admin pode ver dados de outro usuario. qualquer outro
      // papel so enxerga o proprio cadastro.
      if (role !== 'ADMIN') {
        if (id !== userId) {
          res.status(403).json({ error: 'Acesso não autorizado aos dados de outro usuário' });
          return;
        }
      }

      // chamamos o service (/services/user-service.ts) pra buscar o usuario.
      const user = await this.userService.getUserById(id);
      res.json(user);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
        return;
      }
    }
  };

  // cria um novo usuario. admin pode cadastrar qualquer perfil,
  // ja a equipe assistencial (farmaceutico, medico e aluno) so pode
  // cadastrar paciente, e sem permissoes customizadas.
  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const adminId = req.user.userId;
      const role = req.user.role;

      // flag pra saber se quem esta criando e admin (pode tudo).
      let isAdmin = false;
      if (role === 'ADMIN') {
        isAdmin = true;
      }

      // flag pra saber se quem esta criando e da equipe assistencial
      // (so pode cadastrar paciente).
      let isStaff = false;
      if (role === 'FARMACEUTICO' || role === 'MEDICO' || role === 'ALUNO') {
        isStaff = true;
      }

      if (!isAdmin && !isStaff) {
        res.status(403).json({ error: 'Apenas administradores e equipe assistencial podem cadastrar usuários' });
        return;
      }

      // validacao do schema de criacao de usuario.
      const validationResult = userCreateSchema.safeParse(req.body);
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

      const payload: Record<string, any> = { ...validationResult.data };

      // se nao for admin, aplicamos as restricoes da equipe assistencial:
      // so pode criar perfil paciente e nao pode definir permissoes.
      if (!isAdmin) {
        if (payload.role !== 'PACIENTE') {
          res.status(403).json({ error: 'Farmacêuticos, médicos e alunos só podem cadastrar usuários com o perfil Paciente' });
          return;
        }

        // removemos permissions do payload pra equipe nao poder
        // dar privilegios extras a ninguem.
        if ('permissions' in payload) {
          delete payload.permissions;
        }
      }

      // chamamos o service (/services/user-service.ts) pra criar de fato,
      // passando o id do admin/operador logado pra registrar autoria.
      const user = await this.userService.createUser(adminId, payload as any);
      res.status(201).json(user);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
        return;
      }
    }
  };

  // atualiza os dados de um usuario.
  // admin edita qualquer um, a equipe assistencial so edita paciente,
  // e o proprio usuario pode editar a si mesmo.
  // campos sensiveis (role, registerDoc, permissions, active) so mudam por admin.
  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      // confere se o usuario existe antes de qualquer coisa.
      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // regra de autorizacao detalhada quando nao e admin.
      if (role !== 'ADMIN') {
        // se nao for admin e nao for o proprio usuario, so equipe
        // assistencial pode editar, e ainda assim so paciente.
        if (id !== adminId) {
          let isStaff = false;
          if (role === 'FARMACEUTICO') {
            isStaff = true;
          } else {
            if (role === 'MEDICO') {
              isStaff = true;
            } else {
              if (role === 'ALUNO') {
                isStaff = true;
              } else {
                isStaff = false;
              }
            }
          }

          if (isStaff) {
            // equipe assistencial so edita paciente. qualquer outro
            // papel alvo e bloqueado.
            if (userRecord.role !== 'PACIENTE') {
              res.status(403).json({ error: 'Acesso não autorizado para modificar este usuário' });
              return;
            }
          } else {
            // qualquer outro papel (paciente tentando editar outro, por ex).
            res.status(403).json({ error: 'Acesso não autorizado para modificar outro usuário' });
            return;
          }
        }
      }

      // validacao do schema de update de usuario.
      const validationResult = userUpdateSchema.safeParse(req.body);
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

      const payload: Record<string, any> = { ...validationResult.data };

      // pra quem nao e admin, removemos os campos sensiveis do payload,
      // impedindo escalada de privilegio ou autoativacao.
      if (role !== 'ADMIN') {
        if ('role' in payload) {
          delete payload.role;
        }

        if ('registerDoc' in payload) {
          delete payload.registerDoc;
        }

        if ('permissions' in payload) {
          delete payload.permissions;
        }

        if ('active' in payload) {
          delete payload.active;
        }
      }

      // chamamos o service (/services/user-service.ts) pra aplicar o update.
      const updated = await this.userService.updateUser(adminId, id, payload as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
        return;
      }
    }
  };

  // exclui um usuario. so admin pode, e ele nao pode excluir a propria conta
  // pra nao deixar o sistema sem administrador.
  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      // exclusao de usuario e acao exclusiva do admin.
      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem excluir usuários' });
        return;
      }

      // trava de seguranca: admin nao pode se auto-excluir,
      // evitando ficar sem ninguem pra gerenciar o sistema.
      if (id === adminId) {
        res.status(400).json({ error: 'Não é permitido excluir sua própria conta de administrador' });
        return;
      }

      // confere se o usuario existe antes de tentar excluir.
      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // chamamos o service (/services/user-service.ts) pra aplicar a exclusao.
      const result = await this.userService.deleteUser(adminId, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
        return;
      }
    }
  };

  // ativa ou desativa um usuario. so admin pode.
  // tambem bloqueia o admin de desativar a propria conta.
  toggleActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      // ativacao/desativacao de usuario tambem e exclusiva do admin.
      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem ativar ou desativar usuários' });
        return;
      }

      // trava de seguranca: admin nao pode se autodesativar,
      // pra nao se trancar fora do sistema.
      if (id === adminId) {
        res.status(400).json({ error: 'Não é permitido desativar sua própria conta de administrador' });
        return;
      }

      // confere se o usuario existe antes de mexer no status.
      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // validacao do schema que traz o campo active (true ou false).
      const validationResult = userToggleActiveSchema.safeParse(req.body);
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

      // chamamos o service (/services/user-service.ts) pra aplicar a mudanca de status.
      const updated = await this.userService.toggleActive(adminId, id, validationResult.data.active);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
        return;
      }
    }
  };
}