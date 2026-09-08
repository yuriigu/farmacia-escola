import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { authRateLimiter } from '../middlewares/RateLimitMiddleware';
import { validateBody, loginSchema, registerPatientSchema } from '../middlewares/ValidationMiddleware';

const router = Router();
const controller = new AuthController();

router.post('/login', authRateLimiter, validateBody(loginSchema), controller.login);
router.post('/register', authRateLimiter, validateBody(registerPatientSchema), controller.register);
router.get('/me', authMiddleware, controller.me);
router.get('/profile', authMiddleware, controller.me);
router.put('/profile', authMiddleware, controller.updateProfile);

export default router;