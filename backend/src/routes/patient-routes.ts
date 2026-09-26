import { Router } from 'express';
import { PatientController } from '../controllers/patient-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requirePermission } from '../middlewares/role-middleware';

// rotas de paciente. define os endpoints e amarra os middlewares
// de auth, permissao granular e papel.
// aqui a combinacao e sempre a mesma: a permissao diz qual acao
// esta sendo feita, e authorizeRoles restringe quem da equipe pode
// faze-la. o paciente comum tambem passa por alguns endpoints, mas
// o proprio controller cuida de filtrar por dono.
const router = Router();
const controller = new PatientController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura de pacientes. quem tem PATIENTS_READ enxerga.
// o controller ainda decide se paciente ve so a si mesmo ou
// se a equipe ve a listagem completa.
router.get('/', requirePermission('PATIENTS_READ'), controller.getAll);
router.get('/:id', requirePermission('PATIENTS_READ'), controller.getById);

// cadastro de paciente. aqui a lista de papeis inclui medico tambem,
// porque ele tambem cadastra paciente no fluxo assistencial.
router.post('/', requirePermission('PATIENTS_CREATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'), controller.create);

// atualizacao de paciente. equipe (admin, farmaceutico e aluno) pode
// editar qualquer um; o proprio paciente tambem pode se editar,
// mas isso e tratado no controller, nao aqui na rota.
router.put('/:id', requirePermission('PATIENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);

// exclusao de paciente. e mais restrita que o cadastro: so admin
// e farmaceutico podem.
router.delete('/:id', requirePermission('PATIENTS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;