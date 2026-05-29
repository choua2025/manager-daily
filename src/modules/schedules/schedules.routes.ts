import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getSchedules, getUpcoming, createSchedule, updateSchedule, completeSchedule, deleteSchedule } from './schedules.controller';

const router = Router();
router.use(authenticate);

router.get('/', getSchedules);
router.get('/upcoming', getUpcoming);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
router.patch('/:id/complete', completeSchedule);
router.delete('/:id', deleteSchedule);

export default router;
