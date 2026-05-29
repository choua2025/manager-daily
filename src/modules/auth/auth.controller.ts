import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendCreated, sendError } from '../../utils/response';

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, currency, timezone } = req.body;

  if (!name || !email || !password) {
    sendError(res, 'Name, email, and password are required', 400);
    return;
  }

  if (password.length < 6) {
    sendError(res, 'Password must be at least 6 characters', 400);
    return;
  }

  const result = await authService.register({ name, email, password, currency, timezone });
  sendCreated(res, result, 'Registration successful');
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required', 400);
    return;
  }

  const result = await authService.login({ email, password });
  sendSuccess(res, result, 'Login successful');
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    sendError(res, 'Refresh token required', 400);
    return;
  }

  const tokens = await authService.refreshToken(refreshToken);
  sendSuccess(res, tokens, 'Token refreshed');
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  sendSuccess(res, null, 'Logged out successfully');
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.userId);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }
  sendSuccess(res, user, 'Profile retrieved');
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    sendError(res, 'Email is required', 400);
    return;
  }

  await authService.forgotPassword(email);
  sendSuccess(res, null, 'If an account with that email exists, an OTP has been sent.');
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    sendError(res, 'Email and OTP are required', 400);
    return;
  }

  const result = await authService.verifyOtp(email, otp);
  sendSuccess(res, result, 'OTP verified successfully');
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    sendError(res, 'Token and new password are required', 400);
    return;
  }

  if (password.length < 6) {
    sendError(res, 'Password must be at least 6 characters', 400);
    return;
  }

  await authService.resetPassword(token, password);
  sendSuccess(res, null, 'Password has been reset successfully. Please log in with your new password.');
};
