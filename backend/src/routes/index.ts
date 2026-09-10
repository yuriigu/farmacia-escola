import { Router } from 'express';
import authRoutes from './auth-routes';
import medicineRoutes from './medicine-routes';
import batchRoutes from './batch-routes';
import withdrawalRoutes from './withdrawal-routes';
import disposalRoutes from './disposal-routes';
import patientRoutes from './patient-routes';
import scheduleSlotRoutes from './schedule-slot-routes';
import appointmentRoutes from './appointment-routes';
import userRoutes from './user-routes';
import activityLogRoutes from './activity-log-routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/medicines', medicineRoutes);
router.use('/batches', batchRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/disposals', disposalRoutes);
router.use('/patients', patientRoutes);
router.use('/schedule-slots', scheduleSlotRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/users', userRoutes);
router.use('/activity-logs', activityLogRoutes);

export default router;