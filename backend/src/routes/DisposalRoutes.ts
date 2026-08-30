import { Router } from 'express';
import { DisposalController } from '../controllers/DisposalController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new DisposalController();

router.use(authMiddleware);

router.get('/', requirePermission('disposals'), controller.getAll);
router.get('/:id', requirePermission('disposals'), controller.getById);
router.post('/', requirePermission('disposals'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.put('/:id', requirePermission('disposals'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);
router.delete('/:id', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);
router.post('/:id/revert', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revert);

export default router;