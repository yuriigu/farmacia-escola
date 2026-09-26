import { Router } from 'express';
import { ActivityLogController } from '../controllers/activity-log-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles } from '../middlewares/role-middleware';

// rotas de log de atividade (auditoria). esse arquivo define o prefixo
// e os endpoints, e amarra os middlewares de auth e autorizacao.
// a regra aqui e simples: so admin mexe com auditoria.
const router = Router();
const controller = new ActivityLogController();

// aqui a gente protege o grupo inteiro de uma vez: primeiro garante
// que o usuario esta autenticado (auth-middleware) e depois exige
// o papel de admin (role-middleware). assim nenhuma rota abaixo
// precisa repetir essas checagens.
router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

// lista logs com filtros e paginacao, delegando pro controller.
router.get('/', controller.getAll);

// busca um log especifico pelo id, tambem delegando pro controller.
router.get('/:id', controller.getById);

export default router;