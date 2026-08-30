import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authorizeRoles } from '../middlewares/RoleMiddleware';

const router = Router();
const controller = new UserController();

router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/toggle-active', controller.toggleActive);

export default router;
