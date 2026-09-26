import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { validateBody, loginSchema, registerPatientSchema } from '../middlewares/validation-middleware';
import { requirePermission } from '../middlewares/role-middleware';
import { authIpRateLimit, authAccountRateLimit } from '../middlewares/rate-limit-middleware';

// rotas de autenticacao e perfil. esse arquivo mistura endpoints
// publicos (login e cadastro) com endpoints protegidos (me e profile).
// nos publicos, aplicamos rate limit duplo pra mitigar forca bruta:
// um limite por ip (mais grosso) e um por conta (mais estrito).
const router = Router();
const controller = new AuthController();

// login: limitado por ip e por conta antes de chegar no controller.
// a ordem importa: primeiro o rate limit por ip (barra flood), depois
// por conta (barra ataque direcionado a um email especifico).
// o validateBody roda por ultimo, ja com o schema do login.
router.post('/login', authIpRateLimit, authAccountRateLimit, validateBody(loginSchema), controller.login);

// cadastro publico de paciente. mesmo rate limit do login,
// pelo mesmo motivo (evitar abuso na criacao de contas).
// usa o schema registerPatientSchema pra validar o corpo.
router.post('/register', authIpRateLimit, authAccountRateLimit, validateBody(registerPatientSchema), controller.register);

// me: devolve o perfil do usuario logado. precisa estar autenticado.
// aqui chamamos o auth-middleware pra popular o req.user.
router.get('/me', authMiddleware, controller.me);

// profile: alias do me, mesmo handler. existe pra manter compatibilidade
// com o front que ja usava /profile.
router.get('/profile', authMiddleware, controller.me);

// atualizacao do proprio perfil. exige autenticacao e a permissao
// granular PROFILE_UPDATE, que quase todo papel tem.
router.put('/profile', authMiddleware, requirePermission('PROFILE_UPDATE'), controller.updateProfile);

export default router;