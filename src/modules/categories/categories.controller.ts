import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { CategoriesService } from './categories.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';
import { CategoryType } from '@prisma/client';

const service = new CategoriesService();

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  const type = req.query.type as CategoryType | undefined;
  const data = await service.getAll(req.user!.userId, type);
  sendSuccess(res, data);
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) { sendError(res, 'Name and type are required'); return; }
  const data = await service.create(req.user!.userId, { name, type, icon, color });
  sendCreated(res, data, 'Category created');
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const data = await service.update(req.user!.userId, req.params.id, req.body);
  sendSuccess(res, data, 'Category updated');
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  await service.delete(req.user!.userId, req.params.id);
  sendSuccess(res, null, 'Category deleted');
};
