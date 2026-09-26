import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import { authorizeRoles, requireAnyPermission } from '../middlewares/role-middleware';

// rotas de agendamento (consulta). define os endpoints e amarra
// os middlewares de auth, permissao granular (requireAnyPermission)
// e papel (authorizeRoles).
// a ideia e combinar as duas checagens: permissao diz o que pode ser
// feito, e o papel restringe quem da equipe pode fazer aquilo.
const router = Router();
const controller = new AppointmentController();

// todas as rotas abaixo exigem usuario autenticado.
router.use(authMiddleware);

// leitura: quem tem permissao de read enxerga. o filtro de paciente
// (so ver a si mesmo) e feito la no service/controller.
router.get('/', requireAnyPermission('APPOINTMENTS_READ'), controller.getAll);
router.get('/:id', requireAnyPermission('APPOINTMENTS_READ'), controller.getById);

// criacao de consulta. paciente tambem pode criar a propria, mas o
// controller cuida de amarrar o patientId ao dono do token.
router.post('/', requireAnyPermission('APPOINTMENTS_CREATE'), controller.create);

// atualizacao geral da consulta. aqui a gente abre a permissao pra update
// mas restringe os papeis da equipe que podem editar (admin, farmaceutico, aluno).
router.put('/:id', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.update);

// atualizacao de status. paciente tambem entra porque ele pode cancelar
// a propria consulta. a permissao aceita update ou cancel, refletindo
// os dois fluxos que passam por aqui.
router.put('/:id/status', requireAnyPermission('APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO', 'PACIENTE'), controller.updateStatus);

// dispensacao de medicamento. acao de equipe, sem paciente.
router.post('/:id/dispense', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO', 'ALUNO'), controller.dispense);

// estorno de dispensacao. mais restrito ainda: so admin e farmaceutico.
router.post('/:id/revert-dispense', requireAnyPermission('APPOINTMENTS_UPDATE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.revertDispense);

// exclusao de consulta. tambem so admin e farmaceutico.
router.delete('/:id', requireAnyPermission('APPOINTMENTS_DELETE'), authorizeRoles('ADMIN', 'FARMACEUTICO'), controller.delete);

export default router;