import { Router } from 'express';
import { WithdrawalController } from '../controllers/WithdrawalController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new WithdrawalController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.post('/', requirePermission('withdrawals'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);

export default router;
