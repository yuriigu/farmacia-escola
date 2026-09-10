import { Router } from 'express';
import { WithdrawalController } from '../controllers/WithdrawalController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/RoleMiddleware';
import { validateBody, withdrawalCreateSchema } from '../middlewares/ValidationMiddleware';

const router = Router();
const controller = new WithdrawalController();

router.use(authMiddleware);

router.get('/mine', requirePermission('MY_WITHDRAWALS_READ'), controller.getAll);
router.get('/', requirePermission('WITHDRAWALS_READ'), controller.getAll);
router.get('/:id', requirePermission('WITHDRAWALS_READ'), controller.getById);
router.post('/', requirePermission('WITHDRAWALS_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), validateBody(withdrawalCreateSchema), controller.create);
router.post('/:id/cancel', requirePermission('WITHDRAWALS_CANCEL'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.cancel);
router.put('/:id', requirePermission('WITHDRAWALS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', requirePermission('WITHDRAWALS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;