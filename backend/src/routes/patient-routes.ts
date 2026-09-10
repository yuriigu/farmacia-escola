import { Router } from 'express';
import { PatientController } from '../controllers/patient-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

const router = Router();
const controller = new PatientController();

router.use(authMiddleware);

router.get('/', requirePermission('PATIENTS_READ'), controller.getAll);
router.get('/:id', requirePermission('PATIENTS_READ'), controller.getById);
router.post('/', requirePermission('PATIENTS_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'), controller.create);
router.put('/:id', requirePermission('PATIENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);
router.delete('/:id', requirePermission('PATIENTS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;