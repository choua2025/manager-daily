import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { SchedulesService } from './schedules.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const service = new SchedulesService();

export const getSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getAll(req.user!.userId, req.query.status as any);
  sendSuccess(res, data);
};

export const getUpcoming = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getUpcoming(req.user!.userId);
  sendSuccess(res, data);
};

export const createSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, scheduleType, startDate } = req.body;
  if (!title || !scheduleType || !startDate) {
    sendError(res, 'title, scheduleType, and startDate are required');
    return;
  }
  const data = await service.create(req.user!.userId, req.body);
  sendCreated(res, data, 'Schedule created');
};

export const updateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Schedule updated');
};

export const completeSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.complete(req.user!.userId, req.params.id);
  sendSuccess(res, data, 'Schedule marked as completed');
};

export const deleteSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Schedule deleted');
};
