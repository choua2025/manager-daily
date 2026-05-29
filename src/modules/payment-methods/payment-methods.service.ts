import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { PaymentMethodType } from '@prisma/client';

export class PaymentMethodsService {
  async getAll(userId: string) {
    return prisma.paymentMethod.findMany({
      where: { OR: [{ userId }, { userId: null }], isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, name: string, type: PaymentMethodType) {
    return prisma.paymentMethod.create({ data: { userId, name, type } });
  }

  async update(userId: string, id: string, dto: { name?: string; type?: PaymentMethodType }) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw new AppError('Payment method not found', 404);
    return prisma.paymentMethod.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw new AppError('Payment method not found', 404);
    return prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
  }
}
