import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { NotificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/response';

const service = new NotificationsService();

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getAll(req.user!.userId);
  sendSuccess(res, data);
};

export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.markRead(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Notification marked as read');
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.markAllRead(req.user!.userId);
  sendSuccess(res, null, 'All notifications marked as read');
};
