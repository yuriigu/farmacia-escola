import { Router } from 'express';
import { MedicineController } from '../controllers/MedicineController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
const controller = new MedicineController();

router.use(authMiddleware);

router.get('/', controller.getAll);
router.post('/', authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.create);

export default router;