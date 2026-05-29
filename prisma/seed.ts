/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ===================== DEFAULT CATEGORIES =====================
  const expenseCategories = [
    { name: 'Food & Dining', icon: '🍔', color: '#F97316' },
    { name: 'Rent', icon: '🏠', color: '#8B5CF6' },
    { name: 'Electricity', icon: '⚡', color: '#EAB308' },
    { name: 'Water', icon: '💧', color: '#06B6D4' },
    { name: 'Internet', icon: '🌐', color: '#3B82F6' },
    { name: 'Transport', icon: '🚗', color: '#EC4899' },
    { name: 'Shopping', icon: '🛒', color: '#14B8A6' },
    { name: 'Health', icon: '🏥', color: '#EF4444' },
    { name: 'Education', icon: '📚', color: '#6366F1' },
    { name: 'Entertainment', icon: '🎮', color: '#A855F7' },
    { name: 'Family', icon: '👨‍👩‍👧', color: '#F43F5E' },
    { name: 'Debt Payment', icon: '💳', color: '#64748B' },
    { name: 'Business', icon: '💼', color: '#0EA5E9' },
    { name: 'Other', icon: '📦', color: '#6B7280' },
  ];

  const incomeCategories = [
    { name: 'Salary', icon: '💰', color: '#22C55E' },
    { name: 'Freelance', icon: '💻', color: '#10B981' },
    { name: 'Business', icon: '🏢', color: '#059669' },
    { name: 'Investment', icon: '📈', color: '#16A34A' },
    { name: 'Gift', icon: '🎁', color: '#4ADE80' },
    { name: 'Bonus', icon: '🎯', color: '#86EFAC' },
    { name: 'Other Income', icon: '💵', color: '#BBF7D0' },
  ];

  // Create default expense categories
  for (const cat of expenseCategories) {
    await prisma.category.upsert({
      where: { id: `default-exp-${cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}` },
      update: {},
      create: {
        id: `default-exp-${cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
        name: cat.name,
        type: 'EXPENSE',
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        userId: null,
      },
    });
  }

  // Create default income categories
  for (const cat of incomeCategories) {
    await prisma.category.upsert({
      where: { id: `default-inc-${cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}` },
      update: {},
      create: {
        id: `default-inc-${cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
        name: cat.name,
        type: 'INCOME',
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        userId: null,
      },
    });
  }
  console.log('✅ Default categories created');

  // ===================== DEFAULT PAYMENT METHODS =====================
  const paymentMethods = [
    { name: 'Cash', type: 'CASH' as const },
    { name: 'Bank Transfer', type: 'BANK_TRANSFER' as const },
    { name: 'QR Payment', type: 'QR_PAYMENT' as const },
    { name: 'Credit Card', type: 'CREDIT_CARD' as const },
    { name: 'Debit Card', type: 'DEBIT_CARD' as const },
    { name: 'Mobile Wallet', type: 'MOBILE_WALLET' as const },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: `default-pm-${pm.type.toLowerCase()}` },
      update: {},
      create: {
        id: `default-pm-${pm.type.toLowerCase()}`,
        name: pm.name,
        type: pm.type,
        userId: null,
      },
    });
  }
  console.log('✅ Default payment methods created');

  // ===================== ADMIN USER =====================
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifemanager.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@lifemanager.com',
      password: adminPassword,
      role: 'ADMIN',
      currency: 'USD',
      timezone: 'Asia/Vientiane',
    },
  });

  // Admin cash account
  await prisma.account.upsert({
    where: { id: `${admin.id}-cash` },
    update: {},
    create: {
      id: `${admin.id}-cash`,
      userId: admin.id,
      name: 'Cash Wallet',
      type: 'CASH',
      balance: 5000,
      currency: 'USD',
      isDefault: true,
    },
  });
  console.log('✅ Admin user created');

  // ===================== DEMO USER =====================
  const userPassword = await bcrypt.hash('user123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@lifemanager.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@lifemanager.com',
      password: userPassword,
      role: 'USER',
      currency: 'USD',
      timezone: 'Asia/Vientiane',
    },
  });

  // Demo accounts
  const cashAccount = await prisma.account.upsert({
    where: { id: `${user.id}-cash` },
    update: {},
    create: {
      id: `${user.id}-cash`,
      userId: user.id,
      name: 'Cash Wallet',
      type: 'CASH',
      balance: 1200,
      currency: 'USD',
      isDefault: true,
    },
  });

  const bankAccount = await prisma.account.upsert({
    where: { id: `${user.id}-bank` },
    update: {},
    create: {
      id: `${user.id}-bank`,
      userId: user.id,
      name: 'Main Bank Account',
      type: 'BANK',
      balance: 8500,
      currency: 'USD',
    },
  });
  console.log('✅ Demo user created');

  // ===================== SAMPLE TRANSACTIONS (May 2026) =====================
  const today = new Date('2026-05-27');

  const salaryCategory = await prisma.category.findFirst({ where: { name: 'Salary', isDefault: true } });
  const freelanceCategory = await prisma.category.findFirst({ where: { name: 'Freelance', isDefault: true } });
  const foodCategory = await prisma.category.findFirst({ where: { name: 'Food & Dining', isDefault: true } });
  const rentCategory = await prisma.category.findFirst({ where: { name: 'Rent', isDefault: true } });
  const transportCategory = await prisma.category.findFirst({ where: { name: 'Transport', isDefault: true } });
  const entertainmentCategory = await prisma.category.findFirst({ where: { name: 'Entertainment', isDefault: true } });
  const internetCategory = await prisma.category.findFirst({ where: { name: 'Internet', isDefault: true } });
  const healthCategory = await prisma.category.findFirst({ where: { name: 'Health', isDefault: true } });

  const cashPm = await prisma.paymentMethod.findFirst({ where: { type: 'CASH', userId: null } });
  const bankPm = await prisma.paymentMethod.findFirst({ where: { type: 'BANK_TRANSFER', userId: null } });

  // Income transactions
  if (salaryCategory && bankPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: bankAccount.id,
        categoryId: salaryCategory.id,
        paymentMethodId: bankPm.id,
        type: 'INCOME',
        status: 'CONFIRMED',
        amount: 2000,
        transactionDate: new Date('2026-05-25'),
        title: 'May Salary',
        description: 'Monthly salary',
      },
    });
  }

  if (freelanceCategory && bankPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: bankAccount.id,
        categoryId: freelanceCategory.id,
        paymentMethodId: bankPm.id,
        type: 'INCOME',
        status: 'CONFIRMED',
        amount: 350,
        transactionDate: new Date('2026-05-15'),
        title: 'Freelance Project Payment',
        description: 'Website design project',
      },
    });
  }

  // Expense transactions
  if (rentCategory && bankPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: bankAccount.id,
        categoryId: rentCategory.id,
        paymentMethodId: bankPm.id,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        amount: 800,
        transactionDate: new Date('2026-05-01'),
        title: 'Monthly Rent',
        vendorName: 'Property Owner',
      },
    });
  }

  if (foodCategory && cashPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: cashAccount.id,
        categoryId: foodCategory.id,
        paymentMethodId: cashPm.id,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        amount: 250,
        transactionDate: new Date('2026-05-20'),
        title: 'Grocery Shopping',
        vendorName: 'Local Supermarket',
      },
    });
  }

  if (transportCategory && cashPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: cashAccount.id,
        categoryId: transportCategory.id,
        paymentMethodId: cashPm.id,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        amount: 80,
        transactionDate: new Date('2026-05-22'),
        title: 'Fuel & Transport',
      },
    });
  }

  if (internetCategory && bankPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: bankAccount.id,
        categoryId: internetCategory.id,
        paymentMethodId: bankPm.id,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        amount: 30,
        transactionDate: new Date('2026-05-05'),
        title: 'Internet Bill',
        vendorName: 'ISP Provider',
      },
    });
  }

  if (entertainmentCategory && cashPm) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: cashAccount.id,
        categoryId: entertainmentCategory.id,
        paymentMethodId: cashPm.id,
        type: 'EXPENSE',
        status: 'CONFIRMED',
        amount: 60,
        transactionDate: new Date('2026-05-18'),
        title: 'Movies & Dining Out',
      },
    });
  }
  console.log('✅ Sample transactions created');

  // ===================== SAMPLE BUDGETS =====================
  if (foodCategory) {
    await prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId: user.id, categoryId: foodCategory.id, month: 5, year: 2026 } },
      update: {},
      create: { userId: user.id, categoryId: foodCategory.id, month: 5, year: 2026, amount: 300, alertAt: 80 },
    });
  }
  if (transportCategory) {
    await prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId: user.id, categoryId: transportCategory.id, month: 5, year: 2026 } },
      update: {},
      create: { userId: user.id, categoryId: transportCategory.id, month: 5, year: 2026, amount: 60, alertAt: 80 },
    });
  }
  if (entertainmentCategory) {
    await prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId: user.id, categoryId: entertainmentCategory.id, month: 5, year: 2026 } },
      update: {},
      create: { userId: user.id, categoryId: entertainmentCategory.id, month: 5, year: 2026, amount: 50, alertAt: 80 },
    });
  }
  console.log('✅ Sample budgets created');

  // ===================== SAMPLE SCHEDULES =====================
  await prisma.schedule.create({
    data: {
      userId: user.id,
      title: 'Pay Monthly Rent',
      description: 'Transfer rent to property owner',
      scheduleType: 'BILL_PAYMENT',
      startDate: new Date('2026-06-01'),
      isAllDay: true,
      reminderMinutesBefore: 1440,
      status: 'PENDING',
    },
  });

  await prisma.schedule.create({
    data: {
      userId: user.id,
      title: 'Pay Internet Bill',
      scheduleType: 'BILL_PAYMENT',
      startDate: new Date('2026-06-05'),
      isAllDay: true,
      reminderMinutesBefore: 1440,
      status: 'PENDING',
    },
  });

  await prisma.schedule.create({
    data: {
      userId: user.id,
      title: 'Expected Salary',
      description: 'Monthly salary payment',
      scheduleType: 'INCOME_EXPECTED',
      startDate: new Date('2026-06-25'),
      isAllDay: true,
      status: 'PENDING',
    },
  });

  await prisma.schedule.create({
    data: {
      userId: user.id,
      title: 'Review Monthly Budget',
      scheduleType: 'PERSONAL',
      startDate: new Date('2026-06-01'),
      isAllDay: false,
      startTime: '09:00',
      status: 'PENDING',
    },
  });
  console.log('✅ Sample schedules created');

  // ===================== SAMPLE NOTIFICATIONS =====================
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Budget Alert',
      message: 'Your Transport budget is 133% used. You have overspent by $20.',
      type: 'OVERSPENDING',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Welcome to Life Manager!',
      message: 'Start tracking your finances by adding your first income or expense.',
      type: 'SYSTEM',
      isRead: false,
    },
  });
  console.log('✅ Sample notifications created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('');
  console.log('📧 Admin Login:  admin@lifemanager.com  |  Password: admin123456');
  console.log('📧 Demo Login:   demo@lifemanager.com   |  Password: user123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
