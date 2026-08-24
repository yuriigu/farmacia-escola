import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new UserController();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/toggle-active', controller.toggleActive);

export default router;
