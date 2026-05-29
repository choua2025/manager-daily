import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getNotifications, markRead, markAllRead } from './notifications.controller';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
