import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authRateLimiter } from '../middlewares/rate-limit-middleware';
import { validateBody, loginSchema, registerPatientSchema } from '../middlewares/validation-middleware';
import { requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', authRateLimiter, validateBody(loginSchema), controller.login);
router.post('/register', authRateLimiter, validateBody(registerPatientSchema), controller.register);
router.get('/me', authMiddleware, controller.me);
router.get('/profile', authMiddleware, controller.me);
router.put('/profile', authMiddleware, requirePermission('PROFILE_UPDATE'), controller.updateProfile);

export default router;