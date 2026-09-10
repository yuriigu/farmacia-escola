import { Router } from 'express';
import { ActivityLogController } from '../controllers/activity-log-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles } from '../middlewares/role-middleware';

const router = Router();
const controller = new ActivityLogController();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;