import { Router } from 'express';
import { ScheduleSlotController } from '../controllers/schedule-slot-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

// rotas de escala (slot de agenda). define os endpoints e amarra
// os middlewares de auth, permissao granular e papel.
// escala e uma configuracao de agenda, entao criar, editar e remover
// e acao de gestao, restrita a admin e farmaceutico.
// ja a leitura fica aberta pra quem tem SCHEDULES_READ.
const router = Router();
const controller = new ScheduleSlotController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura de escalas. quem tem SCHEDULES_READ enxerga.
// aceita filtro de periodo via query string, tratado no controller.
router.get('/', requirePermission('SCHEDULES_READ'), controller.getAll);
router.get('/:id', requirePermission('SCHEDULES_READ'), controller.getById);

// criacao de escala. so admin e farmaceutico, porque e uma
// configuracao que afeta a agenda da equipe inteira.
router.post('/', requirePermission('SCHEDULES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.create);

// atualizacao de escala. mesma regra do create.
router.put('/:id', requirePermission('SCHEDULES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.update);

// remocao de escala (soft delete via active=false). tambem so admin
// e farmaceutico.
router.delete('/:id', requirePermission('SCHEDULES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;