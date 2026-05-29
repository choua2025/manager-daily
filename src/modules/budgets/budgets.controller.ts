import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { BudgetsService } from './budgets.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';
import { getCurrentMonth, getCurrentYear } from '../../utils/date';

const service = new BudgetsService();

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, year } = req.query;
  const data = await service.getAll(req.user!.userId, month ? parseInt(month as string) : undefined, year ? parseInt(year as string) : undefined);
  sendSuccess(res, data);
};

export const getMonthlyBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const month = parseInt(req.query.month as string) || getCurrentMonth();
  const year = parseInt(req.query.year as string) || getCurrentYear();
  const budgets = await service.getMonthly(req.user!.userId, month, year);
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0);
  sendSuccess(res, { budgets, totalBudget, totalSpent, month, year });
};

export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const { categoryId, month, year, amount, alertAt, alertThreshold } = req.body;
  if (!month || !year || !amount) { sendError(res, 'month, year, and amount are required'); return; }
  const data = await service.create(req.user!.userId, { categoryId, month: parseInt(month), year: parseInt(year), amount: parseFloat(amount), alertAt: alertAt ?? alertThreshold });
  sendCreated(res, data, 'Budget created');
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Budget updated');
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Budget deleted');
};
