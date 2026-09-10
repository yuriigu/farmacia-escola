import { Router } from 'express';
import { DisposalController } from '../controllers/disposal-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';
import { validateBody, disposalCreateSchema } from '../middlewares/validation-middleware';

const router = Router();
const controller = new DisposalController();

router.use(authMiddleware);

router.get('/', requirePermission('DISPOSALS_READ'), controller.getAll);
router.get('/:id', requirePermission('DISPOSALS_READ'), controller.getById);
router.post('/', requirePermission('DISPOSALS_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), validateBody(disposalCreateSchema), controller.create);
router.put('/:id', requirePermission('DISPOSALS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);
router.post('/:id/revert', requirePermission('DISPOSALS_REVERT'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revert);

export default router;