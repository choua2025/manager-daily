import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { PaymentMethodsService } from './payment-methods.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const service = new PaymentMethodsService();

export const getPaymentMethods = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getAll(req.user!.userId);
  sendSuccess(res, data);
};

export const createPaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, type } = req.body;
  if (!name || !type) { sendError(res, 'Name and type are required'); return; }
  const data = await service.create(req.user!.userId, name, type);
  sendCreated(res, data, 'Payment method created');
};

export const updatePaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Payment method updated');
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Payment method deleted');
};
