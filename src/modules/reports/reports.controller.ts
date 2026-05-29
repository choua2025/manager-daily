import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { ReportsService } from './reports.service';
import { sendSuccess } from '../../utils/response';
import { getCurrentMonth, getCurrentYear } from '../../utils/date';

const service = new ReportsService();

export const getMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const month = parseInt(req.query.month as string) || getCurrentMonth();
  const year = parseInt(req.query.year as string) || getCurrentYear();
  const data = await service.getMonthlyReport(req.user!.userId, month, year);
  sendSuccess(res, data);
};

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getSummary(req.user!.userId);
  sendSuccess(res, data);
};

export const getOverspending = async (req: AuthRequest, res: Response): Promise<void> => {
  const month = req.query.month ? parseInt(req.query.month as string) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const data = await service.getOverspendingReport(req.user!.userId, month, year);
  sendSuccess(res, data);
};

export const getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  const month = req.query.month ? parseInt(req.query.month as string) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const data = await service.getRecommendations(req.user!.userId, month, year);
  sendSuccess(res, data);
};
