import { Router } from 'express';
import authRoutes from './authRoutes';
import medicineRoutes from './medicineRoutes';
import batchRoutes from './batchRoutes';
import withdrawalRoutes from './withdrawalRoutes';
import disposalRoutes from './disposalRoutes';
import patientRoutes from './patientRoutes';
import scheduleSlotRoutes from './scheduleSlotRoutes';
import appointmentRoutes from './appointmentRoutes';
import userRoutes from './userRoutes';
import activityLogRoutes from './activityLogRoutes';

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