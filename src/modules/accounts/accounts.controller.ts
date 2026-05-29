import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { AccountsService } from './accounts.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const service = new AccountsService();

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getAll(req.user!.userId);
  sendSuccess(res, data);
};

export const getAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getById(req.user!.userId, req.params.id);
  sendSuccess(res, data);
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, type, balance, currency, isDefault } = req.body;
  if (!name || !type) { sendError(res, 'Name and type are required'); return; }
  const data = await service.create(req.user!.userId, { name, type, balance, currency, isDefault });
  sendCreated(res, data, 'Account created');
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Account updated');
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Account deleted');
};
