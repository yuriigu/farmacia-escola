import { Router } from 'express';
import { BatchController } from '../controllers/batch-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

// rotas de lote de estoque. define os endpoints e amarra os middlewares
// de auth, permissao granular e papel.
// a ideia aqui e sempre combinar as duas checagens: a permissao diz
// qual acao esta sendo feita, e o papel restringe quem da equipe
// pode faze-la.
const router = Router();
const controller = new BatchController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura de lotes. quem tem BATCHES_READ enxerga.
router.get('/', requirePermission('BATCHES_READ'), controller.getAll);
router.get('/:id', requirePermission('BATCHES_READ'), controller.getById);

// criacao de lote. admin, farmaceutico e aluno podem criar.
router.post('/', requirePermission('BATCHES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);

// ajuste auditado de estoque. e uma acao mais sensivel que a edicao
// normal do lote, entao usa permissao propria (BATCHES_ADJUST) e fica
// restrita a admin e farmaceutico.
router.post('/:id/adjustments', requirePermission('BATCHES_ADJUST'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.adjust);

// bloqueio/desbloqueio sanitario do lote. tambem e sensivel, entao
// fica so com admin e farmaceutico.
router.patch('/:id/block', requirePermission('BATCHES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.toggleBlock);

// atualizacao cadastral do lote (numero, validade, fornecedor, etc).
// nao mexe em quantidade. admin, farmaceutico e aluno podem.
router.put('/:id', requirePermission('BATCHES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);

// exclusao de lote. so admin e farmaceutico.
router.delete('/:id', requirePermission('BATCHES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;