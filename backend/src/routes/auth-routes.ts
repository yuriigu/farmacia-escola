import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { validateBody, loginSchema, registerPatientSchema } from '../middlewares/validation-middleware';
import { requirePermission } from '../middlewares/role-middleware';
import { authIpRateLimit, authAccountRateLimit } from '../middlewares/rate-limit-middleware';

const router = Router();
const controller = new AuthController();

// ENDPOINTS PUBLICOS: LIMITADOS POR IP E POR CONTA PARA MITIGAR FORCA BRUTA
router.post('/login', authIpRateLimit, authAccountRateLimit, validateBody(loginSchema), controller.login);
router.post('/register', authIpRateLimit, authAccountRateLimit, validateBody(registerPatientSchema), controller.register);
router.get('/me', authMiddleware, controller.me);
router.get('/profile', authMiddleware, controller.me);
router.put('/profile', authMiddleware, requirePermission('PROFILE_UPDATE'), controller.updateProfile);

export default router;