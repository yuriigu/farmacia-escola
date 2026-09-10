import { Router } from 'express';
import { ScheduleSlotController } from '../controllers/ScheduleSlotController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new ScheduleSlotController();

router.use(authMiddleware);

router.get('/', requirePermission('SCHEDULES_READ'), controller.getAll);
router.get('/:id', requirePermission('SCHEDULES_READ'), controller.getById);
router.post('/', requirePermission('SCHEDULES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.create);
router.put('/:id', requirePermission('SCHEDULES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);
router.delete('/:id', requirePermission('SCHEDULES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;