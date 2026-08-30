import { Router } from 'express';
import { ActivityLogController } from '../controllers/ActivityLogController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new ActivityLogController();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;