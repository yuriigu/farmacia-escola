import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/AuthMiddleware';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', authMiddleware, controller.me);
router.get('/profile', authMiddleware, controller.me);
router.put('/profile', authMiddleware, controller.updateProfile);

export default router;