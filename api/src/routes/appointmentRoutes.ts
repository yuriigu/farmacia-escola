import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new AppointmentController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id/status', authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.updateStatus);

export default router;
