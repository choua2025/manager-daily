import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ScheduleType, ScheduleStatus } from '@prisma/client';

interface CreateScheduleDto {
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  reminderMinutesBefore?: number;
  transactionId?: string;
  budgetId?: string;
  recurrenceRuleId?: string;
}

export class SchedulesService {
  async getAll(userId: string, status?: ScheduleStatus) {
    return prisma.schedule.findMany({
      where: { userId, ...(status && { status }) },
      include: { transaction: true, budget: true, recurrenceRule: true },
      orderBy: { startDate: 'asc' },
    });
  }

  async getUpcoming(userId: string) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return prisma.schedule.findMany({
      where: {
        userId,
        status: 'PENDING',
        startDate: { gte: now, lte: nextWeek },
      },
      include: { recurrenceRule: true },
      orderBy: { startDate: 'asc' },
      take: 10,
    });
  }

  async create(userId: string, dto: CreateScheduleDto) {
    return prisma.schedule.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        scheduleType: dto.scheduleType,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isAllDay: dto.isAllDay ?? false,
        reminderMinutesBefore: dto.reminderMinutesBefore,
        transactionId: dto.transactionId,
        budgetId: dto.budgetId,
        recurrenceRuleId: dto.recurrenceRuleId,
      },
      include: { recurrenceRule: true },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateScheduleDto>) {
    const schedule = await prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new AppError('Schedule not found', 404);

    return prisma.schedule.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduleType && { scheduleType: dto.scheduleType }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
        ...(dto.reminderMinutesBefore !== undefined && { reminderMinutesBefore: dto.reminderMinutesBefore }),
      },
      include: { recurrenceRule: true },
    });
  }

  async complete(userId: string, id: string) {
    const schedule = await prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new AppError('Schedule not found', 404);
    return prisma.schedule.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  async delete(userId: string, id: string) {
    const schedule = await prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new AppError('Schedule not found', 404);
    await prisma.schedule.delete({ where: { id } });
  }
}
