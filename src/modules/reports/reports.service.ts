import { prisma } from '../../config/prisma';
import { getMonthDateRange, getCurrentMonth, getCurrentYear } from '../../utils/date';

export class ReportsService {
  async getMonthlyReport(userId: string, month: number, year: number) {
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

    const netSaving = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? (netSaving / totalIncome) * 100 : 0;

    // Category breakdown
    const categoryMap: Record<string, { id: string; name: string; amount: number; count: number; percentage: number }> = {};
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const key = t.categoryId;
        if (!categoryMap[key]) {
          categoryMap[key] = { id: key, name: t.category.name, amount: 0, count: 0, percentage: 0 };
        }
        categoryMap[key].amount += Number(t.amount);
        categoryMap[key].count++;
      });

    // Calculate percentages
    Object.values(categoryMap).forEach((c) => {
      c.percentage = totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0;
    });

    const topCategories = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

    // Get budgets for this month
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    const overspendingData = budgets
      .map((b) => {
        const catId = b.categoryId;
        const actual = catId ? (categoryMap[catId]?.amount || 0) : totalExpense;
        const overspent = actual - Number(b.amount);
        const percentage = Number(b.amount) > 0 ? (actual / Number(b.amount)) * 100 : 0;
        return {
          categoryId: catId,
          categoryName: b.category?.name || 'Overall',
          budgetAmount: Number(b.amount),
          actualAmount: actual,
          overspent: Math.max(0, overspent),
          percentage: Math.round(percentage * 10) / 10,
          isOverspent: actual > Number(b.amount),
        };
      })
      .filter((b) => b.isOverspent);

    // AI-style recommendations
    const recommendations = this.generateRecommendations({
      totalIncome,
      totalExpense,
      savingRate,
      categoryMap,
      overspendingData,
    });

    // Previous month comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const { start: prevStart, end: prevEnd } = getMonthDateRange(prevMonth, prevYear);

    const prevExpense = await prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', status: 'CONFIRMED', transactionDate: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    });

    const expenseChange = Number(prevExpense._sum.amount || 0);

    // Save/update monthly report
    const report = await prisma.monthlyReport.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: {
        totalIncome,
        totalExpense,
        netSaving,
        savingRate: Math.round(savingRate * 10) / 10,
        topCategoryData: topCategories,
        overspendingData,
        recommendation: recommendations.join('\n\n'),
      },
      create: {
        userId,
        month,
        year,
        totalIncome,
        totalExpense,
        netSaving,
        savingRate: Math.round(savingRate * 10) / 10,
        topCategoryData: topCategories,
        overspendingData,
        recommendation: recommendations.join('\n\n'),
      },
    });

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      netSaving,
      savingRate: Math.round(savingRate * 10) / 10,
      topCategories,
      overspendingData,
      recommendations,
      previousMonthExpense: expenseChange,
      expenseChangePercent: expenseChange > 0 ? ((totalExpense - expenseChange) / expenseChange) * 100 : 0,
      transactionCount: transactions.length,
    };
  }

  async getSummary(userId: string) {
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const { start, end } = getMonthDateRange(month, year);

    const [incomeAgg, expenseAgg, accounts, unreadNotifications] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', status: 'CONFIRMED', transactionDate: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', status: 'CONFIRMED', transactionDate: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.account.findMany({
        where: { userId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);
    const netSaving = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? (netSaving / totalIncome) * 100 : 0;

    const [recentTransactions, rawBudgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        include: { category: true, account: true },
        orderBy: { transactionDate: 'desc' },
        take: 5,
      }),
      prisma.budget.findMany({
        where: { userId, month, year },
        include: { category: true },
      }),
    ]);

    // Enrich budgets with spentAmount and status for budget alerts
    const budgetAlerts = await Promise.all(
      rawBudgets.map(async (b) => {
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
        const pct = Number(b.amount) > 0 ? (spentAmount / Number(b.amount)) * 100 : 0;
        let status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'OVERSPENT' = 'SAFE';
        if (pct > 100) status = 'OVERSPENT';
        else if (pct > 90) status = 'CRITICAL';
        else if (pct > 70) status = 'WARNING';
        return { ...b, spentAmount, status };
      })
    );

    return {
      currentMonth: {
        totalIncome,
        totalExpense,
        netSaving,
        savingRate: Math.round(savingRate * 10) / 10,
      },
      accounts,
      recentTransactions,
      budgetAlerts: budgetAlerts.filter((b) => b.status !== 'SAFE'),
      unreadNotifications,
    };
  }

  async getOverspendingReport(userId: string, month?: number, year?: number) {
    const m = month || getCurrentMonth();
    const y = year || getCurrentYear();
    const report = await this.getMonthlyReport(userId, m, y);
    return report.overspendingData;
  }

  async getRecommendations(userId: string, month?: number, year?: number) {
    const m = month || getCurrentMonth();
    const y = year || getCurrentYear();
    const report = await this.getMonthlyReport(userId, m, y);
    return report.recommendations;
  }

  private generateRecommendations(data: {
    totalIncome: number;
    totalExpense: number;
    savingRate: number;
    categoryMap: Record<string, { name: string; amount: number; percentage: number }>;
    overspendingData: Array<{ categoryName: string; budgetAmount: number; actualAmount: number; overspent: number }>;
  }): string[] {
    const { totalIncome, savingRate, categoryMap, overspendingData } = data;
    const recs: string[] = [];

    // Saving rate warning
    if (savingRate < 10) {
      recs.push(
        `Your saving rate is only ${savingRate.toFixed(1)}%. Financial experts recommend saving at least 20% of your income. Create a strict monthly budget and cut non-essential spending immediately.`
      );
    } else if (savingRate < 20) {
      recs.push(
        `Your saving rate is ${savingRate.toFixed(1)}%. Try to reach 20% by reducing discretionary spending. Small daily savings add up significantly over time.`
      );
    }

    // Overspending categories
    overspendingData.forEach((o) => {
      recs.push(
        `"${o.categoryName}" budget is overspent by ${o.overspent.toFixed(2)}. Your budget was ${o.budgetAmount.toFixed(2)} but you spent ${o.actualAmount.toFixed(2)}. Aim to cut this by at least ${Math.ceil(o.overspent)} next month.`
      );
    });

    // Food rule: > 30% of income
    const food = Object.values(categoryMap).find((c) => c.name.toLowerCase().includes('food'));
    if (food && totalIncome > 0 && food.amount / totalIncome > 0.3) {
      recs.push(
        `Food expenses are ${((food.amount / totalIncome) * 100).toFixed(1)}% of your income. This is above the recommended 30%. Consider cooking at home more often and limiting restaurant/delivery orders.`
      );
    }

    // Entertainment rule: > 20% of income
    const entertainment = Object.values(categoryMap).find((c) => c.name.toLowerCase().includes('entertainment'));
    if (entertainment && totalIncome > 0 && entertainment.amount / totalIncome > 0.2) {
      recs.push(
        `Entertainment spending is ${((entertainment.amount / totalIncome) * 100).toFixed(1)}% of income. Consider reducing streaming services, dining out, or recreational activities by 20%.`
      );
    }

    // Debt rule: > 40% of income
    const debt = Object.values(categoryMap).find((c) => c.name.toLowerCase().includes('debt'));
    if (debt && totalIncome > 0 && debt.amount / totalIncome > 0.4) {
      recs.push(
        `Debt payments are ${((debt.amount / totalIncome) * 100).toFixed(1)}% of your income — this is a high debt-to-income ratio. Consider debt consolidation or speaking with a financial advisor.`
      );
    }

    if (recs.length === 0) {
      recs.push(
        `Great job! You are within your budget this month. Keep maintaining your spending discipline and consider increasing your savings goal.`
      );
    }

    return recs;
  }
}
