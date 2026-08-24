import { Router } from 'express';
import { BatchController } from '../controllers/BatchController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new BatchController();

router.use(authMiddleware);

router.get('/', requirePermission('batches'), controller.getAll);
router.post('/', requirePermission('batches'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);

export default router;
