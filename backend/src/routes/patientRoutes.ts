import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles, requirePermission } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new PatientController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', requirePermission('patients'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'), controller.create);
router.put('/:id', requirePermission('patients'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;
