import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new AppointmentController();

router.use(authMiddleware);

router.get('/', requirePermission('APPOINTMENTS_READ'), controller.getAll);
router.get('/:id', requirePermission('APPOINTMENTS_READ'), controller.getById);
router.post('/', requirePermission('APPOINTMENTS_CREATE'), controller.create);
router.put('/:id', requirePermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.put('/:id/status', requirePermission('APPOINTMENTS_CANCEL'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'), controller.updateStatus);
router.delete('/:id', requirePermission('APPOINTMENTS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;