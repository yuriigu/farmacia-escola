import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new AppointmentController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.put('/:id/status', authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.updateStatus);
router.delete('/:id', controller.delete);

export default router;