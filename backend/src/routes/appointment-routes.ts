import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requireAnyPermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new AppointmentController();

router.use(authMiddleware);

router.get('/', requireAnyPermission('APPOINTMENTS_READ'), controller.getAll);
router.get('/:id', requireAnyPermission('APPOINTMENTS_READ'), controller.getById);
router.post('/', requireAnyPermission('APPOINTMENTS_CREATE'), controller.create);
router.put('/:id', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.put('/:id/status', requireAnyPermission('APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'), controller.updateStatus);
router.post('/:id/dispense', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.dispense);
router.post('/:id/revert-dispense', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revertDispense);
router.delete('/:id', requireAnyPermission('APPOINTMENTS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;