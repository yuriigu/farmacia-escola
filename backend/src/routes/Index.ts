import { Router } from 'express';
import authRoutes from './AuthRoutes';
import medicineRoutes from './MedicineRoutes';
import batchRoutes from './BatchRoutes';
import withdrawalRoutes from './WithdrawalRoutes';
import disposalRoutes from './DisposalRoutes';
import patientRoutes from './PatientRoutes';
import scheduleSlotRoutes from './ScheduleSlotRoutes';
import appointmentRoutes from './AppointmentRoutes';
import userRoutes from './UserRoutes';
import activityLogRoutes from './ActivityLogRoutes';

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