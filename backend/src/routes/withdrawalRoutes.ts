import { Router } from 'express';
import { WithdrawalController } from '../controllers/WithdrawalController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new WithdrawalController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', requirePermission('withdrawals'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.put('/:id', requirePermission('withdrawals'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;
