import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { getMonthDateRange, getCurrentMonth, getCurrentYear } from '../../utils/date';

interface CreateBudgetDto {
  categoryId?: string;
  month: number;
  year: number;
  amount: number;
  alertAt?: number;
}

export class BudgetsService {
  async getAll(userId: string, month?: number, year?: number) {
    return prisma.budget.findMany({
      where: {
        userId,
        ...(month && { month }),
        ...(year && { year }),
      },
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getMonthly(userId: string, month: number, year: number) {
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    // Calculate actual spent for each budget from transactions
    const { start, end } = getMonthDateRange(month, year);

    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            status: 'CONFIRMED',
            transactionDate: { gte: start, lte: end },
            ...(b.categoryId ? { categoryId: b.categoryId } : {}),
          },
          _sum: { amount: true },
        });

        const spentAmount = Number(spent._sum.amount || 0);
        const percentage = Number(b.amount) > 0 ? (spentAmount / Number(b.amount)) * 100 : 0;

        let status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'OVERSPENT' = 'SAFE';
        if (percentage > 100) status = 'OVERSPENT';
        else if (percentage > 90) status = 'CRITICAL';
        else if (percentage > 70) status = 'WARNING';

        return { ...b, spentAmount, percentage: Math.round(percentage * 10) / 10, status };
      })
    );

    return enriched;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    if (dto.amount <= 0) throw new AppError('Budget amount must be greater than 0', 400);

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
        amount: dto.amount,
        alertAt: dto.alertAt ?? 80,
      },
      include: { category: true },
    });

    return budget;
  }

  async update(userId: string, id: string, dto: Partial<CreateBudgetDto>) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new AppError('Budget not found', 404);

    return prisma.budget.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.alertAt !== undefined && { alertAt: dto.alertAt }),
      },
      include: { category: true },
    });
  }

  async delete(userId: string, id: string) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new AppError('Budget not found', 404);
    await prisma.budget.delete({ where: { id } });
  }

  async getOverspending(userId: string, month?: number, year?: number) {
    const m = month || getCurrentMonth();
    const y = year || getCurrentYear();
    const budgets = await this.getMonthly(userId, m, y);
    return budgets.filter((b) => b.status === 'OVERSPENT' || b.status === 'CRITICAL');
  }
}
