import { Router } from 'express';
import { UserController } from '../controllers/user-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles } from '../middlewares/role-middleware';

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