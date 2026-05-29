import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { CategoryType } from '@prisma/client';

interface CreateCategoryDto {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export class CategoriesService {
  async getAll(userId: string, type?: CategoryType) {
    return prisma.category.findMany({
      where: {
        OR: [{ userId }, { isDefault: true }],
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return prisma.category.create({ data: { userId, ...dto } });
  }

  async update(userId: string, id: string, dto: Partial<CreateCategoryDto>) {
    const cat = await prisma.category.findFirst({ where: { id, userId } });
    if (!cat) throw new AppError('Category not found', 404);
    if (cat.isDefault) throw new AppError('Cannot modify default categories', 400);
    return prisma.category.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    const cat = await prisma.category.findFirst({ where: { id, userId } });
    if (!cat) throw new AppError('Category not found', 404);
    if (cat.isDefault) throw new AppError('Cannot delete default categories', 400);
    return prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
