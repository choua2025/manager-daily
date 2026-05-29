import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary';
import { getMonthDateRange } from '../../utils/date';
import fs from 'fs';

interface CreateTransactionDto {
  accountId: string;
  categoryId: string;
  paymentMethodId?: string;
  type: TransactionType;
  status?: TransactionStatus;
  amount: number;
  transactionDate: string;
  title: string;
  description?: string;
  vendorName?: string;
  referenceNo?: string;
  isRecurring?: boolean;
}

interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
}

export class TransactionsService {
  async getAll(userId: string, filters: TransactionFilters = {}) {
    const { type, categoryId, accountId, startDate, endDate, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...(status && { status }),
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          paymentMethod: true,
          paymentSlip: true,
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      transactions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(userId: string, id: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true, paymentMethod: true, paymentSlip: true },
    });
    if (!tx) throw new AppError('Transaction not found', 404);
    return tx;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Validate account belongs to user
    const account = await prisma.account.findFirst({ where: { id: dto.accountId, userId } });
    if (!account) throw new AppError('Account not found', 404);

    // Validate category exists
    const category = await prisma.category.findFirst({
      where: { id: dto.categoryId, OR: [{ userId }, { isDefault: true }] },
    });
    if (!category) throw new AppError('Category not found', 404);

    // Validate amount > 0
    if (dto.amount <= 0) throw new AppError('Amount must be greater than 0', 400);

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          paymentMethodId: dto.paymentMethodId,
          type: dto.type,
          status: dto.status || 'CONFIRMED',
          amount: dto.amount,
          transactionDate: new Date(dto.transactionDate),
          title: dto.title,
          description: dto.description,
          vendorName: dto.vendorName,
          referenceNo: dto.referenceNo,
          isRecurring: dto.isRecurring || false,
        },
        include: { category: true, account: true, paymentMethod: true },
      });

      // Update account balance
      const balanceChange =
        dto.type === 'INCOME' ? dto.amount : dto.type === 'EXPENSE' ? -dto.amount : 0;

      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // Update budget if expense
      if (dto.type === 'EXPENSE' && created.status === 'CONFIRMED') {
        await this.updateBudget(tx, userId, dto.categoryId, dto.amount);
      }

      return created;
    });

    return transaction;
  }

  async createWithSlip(userId: string, dto: CreateTransactionDto, file: Express.Multer.File) {
    const transaction = await this.create(userId, dto);

    try {
      const { secure_url, public_id } = await uploadToCloudinary(file.path);

      await prisma.paymentSlip.create({
        data: {
          transactionId: transaction.id,
          imageUrl: secure_url,
          cloudinaryPublicId: public_id,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });

      // Clean up temp file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

      return prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: { category: true, account: true, paymentMethod: true, paymentSlip: true },
      });
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw error;
    }
  }

  async update(userId: string, id: string, dto: Partial<CreateTransactionDto>) {
    const tx = await this.getById(userId, id);

    // Reverse old balance effect
    const oldBalanceChange =
      tx.type === 'INCOME'
        ? -Number(tx.amount)
        : tx.type === 'EXPENSE' && tx.status === 'CONFIRMED'
        ? Number(tx.amount)
        : 0;

    const updated = await prisma.$transaction(async (prismaClient) => {
      const result = await prismaClient.transaction.update({
        where: { id },
        data: {
          ...(dto.amount && { amount: dto.amount }),
          ...(dto.transactionDate && { transactionDate: new Date(dto.transactionDate) }),
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
          ...(dto.paymentMethodId !== undefined && { paymentMethodId: dto.paymentMethodId }),
          ...(dto.status && { status: dto.status }),
        },
        include: { category: true, account: true, paymentMethod: true, paymentSlip: true },
      });

      // Restore old balance
      await prismaClient.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: oldBalanceChange } },
      });

      // Apply new balance
      const newAmount = dto.amount ?? Number(tx.amount);
      const newType = dto.type ?? tx.type;
      const newStatus = dto.status ?? tx.status;
      const newBalanceChange =
        newType === 'INCOME' ? newAmount : newType === 'EXPENSE' && newStatus === 'CONFIRMED' ? -newAmount : 0;

      await prismaClient.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: newBalanceChange } },
      });

      return result;
    });

    return updated;
  }

  async delete(userId: string, id: string) {
    const tx = await this.getById(userId, id);

    await prisma.$transaction(async (prismaClient) => {
      // Delete payment slip if exists
      if (tx.paymentSlip) {
        await deleteFromCloudinary(tx.paymentSlip.cloudinaryPublicId);
        await prismaClient.paymentSlip.delete({ where: { id: tx.paymentSlip.id } });
      }

      // Reverse balance
      const balanceChange =
        tx.type === 'INCOME'
          ? -Number(tx.amount)
          : tx.type === 'EXPENSE' && tx.status === 'CONFIRMED'
          ? Number(tx.amount)
          : 0;

      await prismaClient.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: balanceChange } },
      });

      await prismaClient.transaction.delete({ where: { id } });
    });
  }

  async uploadSlip(userId: string, transactionId: string, file: Express.Multer.File) {
    const tx = await this.getById(userId, transactionId);

    // Delete old slip if exists
    if (tx.paymentSlip) {
      await deleteFromCloudinary(tx.paymentSlip.cloudinaryPublicId);
      await prisma.paymentSlip.delete({ where: { id: tx.paymentSlip.id } });
    }

    const { secure_url, public_id } = await uploadToCloudinary(file.path);
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    return prisma.paymentSlip.create({
      data: {
        transactionId,
        imageUrl: secure_url,
        cloudinaryPublicId: public_id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  async deleteSlip(userId: string, transactionId: string) {
    const tx = await this.getById(userId, transactionId);
    if (!tx.paymentSlip) throw new AppError('No payment slip found', 404);
    await deleteFromCloudinary(tx.paymentSlip.cloudinaryPublicId);
    await prisma.paymentSlip.delete({ where: { id: tx.paymentSlip.id } });
  }

  // Helper: update budget when an expense is created
  private async updateBudget(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    amount: number
  ) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budget = await tx.budget.findFirst({
      where: { userId, categoryId, month, year },
    });

    if (!budget) return;

    const newSpent = Number(budget.spentAmount) + amount;
    const percentage = (newSpent / Number(budget.amount)) * 100;

    let status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'OVERSPENT' = 'SAFE';
    if (percentage > 100) status = 'OVERSPENT';
    else if (percentage > 90) status = 'CRITICAL';
    else if (percentage > 70) status = 'WARNING';

    await tx.budget.update({
      where: { id: budget.id },
      data: { spentAmount: newSpent, status },
    });

    // Create overspending notification
    if (status === 'OVERSPENT') {
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      await tx.notification.create({
        data: {
          userId,
          title: 'Budget Overspent!',
          message: `Your ${category?.name || 'category'} budget is overspent by ${(newSpent - Number(budget.amount)).toFixed(2)}`,
          type: 'OVERSPENDING',
        },
      });
    } else if (status === 'CRITICAL') {
      const category = await tx.category.findUnique({ where: { id: categoryId } });
      await tx.notification.create({
        data: {
          userId,
          title: 'Budget Alert',
          message: `Your ${category?.name || 'category'} budget is ${percentage.toFixed(0)}% used`,
          type: 'BUDGET_ALERT',
        },
      });
    }
  }

  async getMonthlyStats(userId: string, month: number, year: number) {
    const { start, end } = getMonthDateRange(month, year);

    const transactions = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: start, lte: end }, status: 'CONFIRMED' },
      include: { category: true },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryMap: Record<string, { name: string; amount: number; count: number }> = {};
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const key = t.categoryId;
        if (!categoryMap[key]) {
          categoryMap[key] = { name: t.category.name, amount: 0, count: 0 };
        }
        categoryMap[key].amount += Number(t.amount);
        categoryMap[key].count++;
      });

    const topCategories = Object.entries(categoryMap)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { totalIncome, totalExpense, netSaving: totalIncome - totalExpense, topCategories };
  }
}
