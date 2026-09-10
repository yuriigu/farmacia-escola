import { Router } from 'express';
import { WithdrawalController } from '../controllers/withdrawal-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';
import { validateBody, withdrawalCreateSchema } from '../middlewares/validation-middleware';

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