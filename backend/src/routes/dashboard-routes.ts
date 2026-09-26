import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { requirePermission } from '../middlewares/role-middleware';

// rotas do painel (dashboard). hoje expoe so o panorama de estoque,
// que alimenta os cards de resumo da tela inicial.
const router = Router();
const controller = new DashboardController();

// todas as rotas do painel exigem usuario autenticado.
router.use(authMiddleware);

// panorama de estoque. reaproveita a permissao MEDICINES_READ porque
// quem pode ver medicamento ja pode ver o resumo agregado do estoque.
router.get('/stock-status', requirePermission('MEDICINES_READ'), controller.getStockStatus);

export default router;