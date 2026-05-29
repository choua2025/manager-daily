import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { hashPassword } from '../../utils/bcrypt';

const router = Router();
router.use(authenticate);

// Update profile
router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, currency, timezone, avatarUrl } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...(name && { name }),
      ...(currency && { currency }),
      ...(timezone && { timezone }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    select: { id: true, name: true, email: true, currency: true, timezone: true, avatarUrl: true, role: true },
  });
  sendSuccess(res, updated, 'Profile updated');
});

// Change password
router.put('/change-password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    sendError(res, 'New password must be at least 6 characters');
    return;
  }
  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: req.user!.userId }, data: { password: hashed } });
  sendSuccess(res, null, 'Password changed successfully');
});

// Admin: list all users
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'ADMIN') { sendError(res, 'Forbidden', 403); return; }
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, users);
});

export default router;
