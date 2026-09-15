import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new DashboardController();

router.use(authMiddleware);

router.get('/stock-status', requirePermission('MEDICINES_READ'), controller.getStockStatus);

export default router;
