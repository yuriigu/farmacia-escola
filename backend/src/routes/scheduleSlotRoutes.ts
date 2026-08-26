import { Router } from 'express';
import { ScheduleSlotController } from '../controllers/ScheduleSlotController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new ScheduleSlotController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', requirePermission('scheduleSlots'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.create);
router.put('/:id', requirePermission('scheduleSlots'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);
router.delete('/:id', requirePermission('scheduleSlots'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;
