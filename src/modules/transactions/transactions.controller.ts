import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { TransactionsService } from './transactions.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const service = new TransactionsService();

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, categoryId, accountId, startDate, endDate, status, page, limit } = req.query;
  const result = await service.getAll(req.user!.userId, {
    type: type as any,
    categoryId: categoryId as string,
    accountId: accountId as string,
    startDate: startDate as string,
    endDate: endDate as string,
    status: status as any,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  });
  sendSuccess(res, result.transactions, 'Success', 200, result.meta);
};

export const getTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.getById(req.user!.userId, req.params.id);
  sendSuccess(res, data);
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { accountId, categoryId, paymentMethodId, type, status, amount, transactionDate, title, description, vendorName, referenceNo, isRecurring } = req.body;
  if (!accountId || !categoryId || !type || !amount || !transactionDate || !title) {
    sendError(res, 'accountId, categoryId, type, amount, transactionDate, and title are required');
    return;
  }
  const data = await service.create(req.user!.userId, {
    accountId, categoryId, paymentMethodId, type, status, amount: parseFloat(amount), transactionDate, title, description, vendorName, referenceNo, isRecurring,
  });
  sendCreated(res, data, 'Transaction created');
};

export const createExpenseWithSlip = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    sendError(res, 'Payment slip image is required');
    return;
  }
  const { accountId, categoryId, paymentMethodId, amount, transactionDate, title, description, vendorName } = req.body;
  if (!accountId || !categoryId || !amount || !transactionDate || !title) {
    sendError(res, 'accountId, categoryId, amount, transactionDate, and title are required');
    return;
  }
  const data = await service.createWithSlip(req.user!.userId, {
    accountId, categoryId, paymentMethodId, type: 'EXPENSE', amount: parseFloat(amount), transactionDate, title, description, vendorName,
  }, file);
  sendCreated(res, data, 'Expense with payment slip created');
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Transaction updated');
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Transaction deleted');
};

export const uploadSlip = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) { sendError(res, 'Image file required'); return; }
  const data = await service.uploadSlip(req.user!.userId, req.params.id, file);
  sendSuccess(res, data, 'Payment slip uploaded');
};

export const deleteSlip = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.deleteSlip(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Payment slip deleted');
};
