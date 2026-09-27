import { Router } from 'express';
import { MedicineController } from '../controllers/medicine-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

// rotas do catalogo de medicamentos. define os endpoints e amarra os
// middlewares de auth, permissao granular e papel.
// a combinacao e a mesma dos outros recursos: a permissao diz qual
// acao esta sendo feita, e authorizeRoles restringe quem da equipe
// pode faze-la.
const router = Router();
const controller = new MedicineController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura do catalogo. quem tem MEDICINES_READ enxerga.
router.get('/', requirePermission('MEDICINES_READ'), controller.getAll);
router.get('/:id', requirePermission('MEDICINES_READ'), controller.getById);

// cadastro de medicamento. admin, farmaceutico e aluno podem criar.
router.post('/', requirePermission('MEDICINES_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.create);

// atualizacao cadastral. mesma regra de papeis do cadastro.
router.put('/:id', requirePermission('MEDICINES_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);

// exclusao (soft delete). e mais restrita: so admin e farmaceutico.
router.delete('/:id', requirePermission('MEDICINES_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;