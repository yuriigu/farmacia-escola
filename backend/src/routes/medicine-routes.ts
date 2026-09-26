import { Router } from 'express';
import authRoutes from './auth-routes';
import medicineRoutes from './medicine-routes';
import batchRoutes from './batch-routes';
import disposalRoutes from './disposal-routes';
import patientRoutes from './patient-routes';
import scheduleSlotRoutes from './schedule-slot-routes';
import appointmentRoutes from './appointment-routes';
import userRoutes from './user-routes';
import activityLogRoutes from './activity-log-routes';
import dashboardRoutes from './dashboard-routes';

// agregador de rotas da api. cada arquivo de rota fica isolado no seu
// recurso, e aqui so amarramos tudo sob um prefixo. o app importa esse
// router e monta sob o prefixo base da api.
const router = Router();

// auth: login, cadastro publico de paciente, perfil do usuario logado.
router.use('/auth', authRoutes);

// catalogo de medicamentos.
router.use('/medicines', medicineRoutes);

// lotes de estoque (inclui ajuste auditado e bloqueio sanitario).
router.use('/batches', batchRoutes);

// descartes de lote (registro, atualizacao e reversao).
router.use('/disposals', disposalRoutes);

// pacientes (cadastro, listagem e dados de saude).
router.use('/patients', patientRoutes);

// escalas (slots de agenda com data, horario e responsavel).
router.use('/schedule-slots', scheduleSlotRoutes);

// agendamentos (consultas: criacao, status, dispensa e estorno).
router.use('/appointments', appointmentRoutes);

// usuarios do sistema (gestao de contas e permissoes).
router.use('/users', userRoutes);

// logs de auditoria (visiveis so pra admin).
router.use('/activity-logs', activityLogRoutes);

// painel com resumos agregados, como o panorama de estoque.
router.use('/dashboard', dashboardRoutes);

export default router;