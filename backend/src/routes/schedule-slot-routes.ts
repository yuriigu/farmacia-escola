import { Router } from 'express';
import { ScheduleSlotController } from '../controllers/schedule-slot-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new ScheduleSlotController();

router.use(authMiddleware);

router.get('/', requirePermission('SCHEDULES_READ'), controller.getAll);
router.get('/:id', requirePermission('SCHEDULES_READ'), controller.getById);
router.post('/', requirePermission('SCHEDULES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.create);
router.put('/:id', requirePermission('SCHEDULES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);
router.delete('/:id', requirePermission('SCHEDULES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;