import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { MedicineController } from '../controllers/medicine.controller';

const router = Router();
const medicineController = new MedicineController();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// Rotas públicas para autenticados
router.get('/', medicineController.list);
router.get('/:id', medicineController.getById);

// Rotas apenas para ADMIN e FARMACEUTICO
router.post('/', roleMiddleware(['ADMIN', 'FARMACEUTICO']), medicineController.create);
router.put('/:id', roleMiddleware(['ADMIN', 'FARMACEUTICO']), medicineController.update);
router.patch('/:id', roleMiddleware(['ADMIN', 'FARMACEUTICO']), medicineController.update);
router.delete('/:id', roleMiddleware(['ADMIN', 'FARMACEUTICO']), medicineController.delete);

export { router as medicineRoutes };
