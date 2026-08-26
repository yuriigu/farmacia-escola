import { Router } from 'express';
import { BatchController } from '../controllers/BatchController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new BatchController();

router.use(authMiddleware);

router.get('/', requirePermission('batches'), controller.getAll);
router.get('/:id', requirePermission('batches'), controller.getById);
router.post('/', requirePermission('batches'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.put('/:id', requirePermission('batches'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;
