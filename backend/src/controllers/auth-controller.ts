import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { AuthService } from '../services/auth-service';
import {
  loginSchema,
  registerPatientSchema,
  updateProfileSchema,
} from '../middlewares/validation-middleware';

// controller responsavel pelos endpoints de autenticacao.
// cuida do login, do cadastro de paciente, da leitura do proprio perfil
// e da atualizacao de dados do usuario logado.
// a regra de negocio (hash de senha, geracao de token, criacao de usuario)
// fica toda no service, aqui so tratamos http e validacao de entrada.
export class AuthController {
  private authService: AuthService;

  constructor() {
    // instanciamos o service de autenticacao (/services/auth-service.ts),
    // que e quem realmente executa login, cadastro e atualizacao de perfil.
    this.authService = new AuthService();
  }

  // faz o login do usuario. valida o corpo, chama o service
  // pra conferir credenciais e devolve o token junto com os dados basicos.
  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // validacao do corpo com o schema zod do validation-middleware.
      // se falhar, devolvemos a primeira mensagem e a lista de issues.
      const validationResult = loginSchema.safeParse(req.body);
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

      const email = validationResult.data.email;
      const password = validationResult.data.password;

      // aqui chamamos o service (/services/auth-service.ts) pra conferir
      // email e senha e montar a resposta com token e usuario.
      const result = await this.authService.login(email, password);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao efetuar login' });
        return;
      }
    }
  };

  // cadastra um novo paciente. valida o corpo e delega pro service,
  // que cria o usuario e o registro de paciente associado.
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // validacao do schema especifico de cadastro de paciente.
      const validationResult = registerPatientSchema.safeParse(req.body);
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

      // chamamos o service (/services/auth-service.ts) pra criar o usuario
      // e o paciente. ele devolve os dados ja sem a senha.
      const result = await this.authService.registerPatient(validationResult.data as any);
      res.status(201).json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao registrar paciente' });
        return;
      }
    }
  };

  // devolve o perfil do usuario logado.
  // o req.user vem populado pelo auth-middleware, entao so precisamos
  // buscar os dados atualizados no service.
  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // se nao tem usuario no request, o middleware nao autenticou.
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // chamamos o service (/services/auth-service.ts) pra buscar
      // o perfil completo do usuario a partir do id do token.
      const profile = await this.authService.getProfile(req.user.userId);
      res.json(profile);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
        return;
      }
    }
  };

  // atualiza os dados do proprio usuario logado (nome, telefone, etc).
  // valida o corpo e delega a persistencia pro service.
  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // validacao do schema de atualizacao de perfil.
      const validationResult = updateProfileSchema.safeParse(req.body);
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

      // chamamos o service (/services/auth-service.ts) pra aplicar o update
      // usando o id do token como referencia do dono do perfil.
      const result = await this.authService.updateProfile(req.user.userId, validationResult.data as any);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
        return;
      }
    }
  };
}