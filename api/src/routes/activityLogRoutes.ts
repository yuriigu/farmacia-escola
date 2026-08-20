import { Router } from 'express';
import { ActivityLogController } from '../controllers/ActivityLogController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new ActivityLogController();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

router.get('/', controller.getAll);

export default router;
