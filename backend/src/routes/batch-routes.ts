import { Router } from 'express';
import { BatchController } from '../controllers/batch-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new BatchController();

router.use(authMiddleware);

router.get('/', requirePermission('BATCHES_READ'), controller.getAll);
router.get('/:id', requirePermission('BATCHES_READ'), controller.getById);
router.post('/', requirePermission('BATCHES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.post('/:id/adjustments', requirePermission('BATCHES_ADJUST'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.adjust);
router.patch('/:id/block', requirePermission('BATCHES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.toggleBlock);
router.put('/:id', requirePermission('BATCHES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', requirePermission('BATCHES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;