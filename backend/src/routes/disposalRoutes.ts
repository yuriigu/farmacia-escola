import { Router } from 'express';
import { DisposalController } from '../controllers/DisposalController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new DisposalController();

router.use(authMiddleware);

router.get('/', requirePermission('disposals'), controller.getAll);
router.post('/', requirePermission('disposals'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.post('/:id/revert', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revert);

export default router;
