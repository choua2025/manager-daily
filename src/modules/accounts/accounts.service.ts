import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { AccountType } from '@prisma/client';

interface CreateAccountDto {
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}

export class AccountsService {
  async getAll(userId: string) {
    return prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getById(userId: string, id: string) {
    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) throw new AppError('Account not found', 404);
    return account;
  }

  async create(userId: string, dto: CreateAccountDto) {
    if (dto.isDefault) {
      await prisma.account.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.account.create({
      data: { userId, ...dto, balance: dto.balance ?? 0 },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateAccountDto>) {
    await this.getById(userId, id);
    if (dto.isDefault) {
      await prisma.account.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.account.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    const account = await this.getById(userId, id);
    if (account.isDefault) throw new AppError('Cannot delete default account', 400);
    return prisma.account.update({ where: { id }, data: { isActive: false } });
  }
}
