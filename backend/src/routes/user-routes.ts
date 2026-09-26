import { Router } from 'express';
import { UserController } from '../controllers/user-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles } from '../middlewares/role-middleware';

// rotas de usuario do sistema. define os endpoints de gestao de contas
// e amarra os middlewares de auth e papel.
// como e uma area sensivel (criar, editar e desativar contas),
// o acesso ja e restrito no topo do grupo pra admin e equipe assistencial,
// e cada rota ainda aperta o cerco conforme o caso.
const router = Router();
const controller = new UserController();

// protege o grupo inteiro: exige autenticacao e restringe a
// admin, farmaceutico, medico e aluno. paciente fica de fora
// de qualquer rota de gestao de usuario.
router.use(authMiddleware);
router.use(authorizeRoles('ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO'));

// listagem de usuarios. o controller filtra o que cada papel enxerga:
// admin ve todos, equipe assistencial ve so pacientes.
router.get('/', controller.getAll);

// busca usuario por id. o controller restringe: admin ve qualquer um,
// os demais papeis so veem a si mesmos.
router.get('/:id', controller.getById);

// criacao de usuario. admin pode cadastrar qualquer perfil; farmaceutico,
// medico e aluno so podem cadastrar paciente, e sem permissoes customizadas.
// essa restricao por perfil alvo fica no controller, aqui so liberamos
// quem pode bater na rota.
router.post('/', authorizeRoles('ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO'), controller.create);

// atualizacao de usuario. a checagem fina (admin edita qualquer um,
// equipe edita so paciente, usuario edita a si mesmo) fica no controller.
router.put('/:id', controller.update);

// exclusao de usuario. so admin, e o controller ainda bloqueia
// o admin de se auto-excluir.
router.delete('/:id', authorizeRoles('ADMIN'), controller.delete);

// ativacao/desativacao de usuario. mesma regra do delete: so admin,
// e o controller bloqueia auto-desativacao.
router.patch('/:id/toggle-active', authorizeRoles('ADMIN'), controller.toggleActive);

export default router;