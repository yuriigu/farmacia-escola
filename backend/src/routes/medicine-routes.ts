import { Router } from 'express';
import { MedicineController } from '../controllers/medicine-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new MedicineController();

router.use(authMiddleware);

router.get('/', requirePermission('MEDICINES_READ'), controller.getAll);
router.get('/:id', requirePermission('MEDICINES_READ'), controller.getById);
router.post('/', requirePermission('MEDICINES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);
router.put('/:id', requirePermission('MEDICINES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', requirePermission('MEDICINES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;