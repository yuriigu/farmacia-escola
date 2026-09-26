import { Router } from 'express';
import { DisposalController } from '../controllers/disposal-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';
import { validateBody, disposalCreateSchema } from '../middlewares/validation-middleware';

// rotas de descarte de lote. define os endpoints e amarra os middlewares
// de auth, permissao granular, papel e validacao de corpo.
// descarte mexe em estoque e em rastreabilidade sanitaria, entao
// a maioria das acoes fica restrita a admin e farmaceutico.
const router = Router();
const controller = new DisposalController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura de descartes. quem tem DISPOSALS_READ enxerga.
router.get('/', requirePermission('DISPOSALS_READ'), controller.getAll);
router.get('/:id', requirePermission('DISPOSALS_READ'), controller.getById);

// registro de novo descarte. admin, farmaceutico e aluno podem criar.
// o validateBody roda por ultimo pra validar o corpo contra o schema
// de criacao de descarte antes de chegar no controller.
router.post('/', requirePermission('DISPOSALS_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), validateBody(disposalCreateSchema), controller.create);

// atualizacao de descarte. so admin e farmaceutico.
router.put('/:id', requirePermission('DISPOSALS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);

// reversao de descarte. acao sensivel porque devolve saldo ao lote,
// entao usa permissao propria (DISPOSALS_REVERT) e fica restrita
// a admin e farmaceutico.
router.post('/:id/revert', requirePermission('DISPOSALS_REVERT'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revert);

export default router;