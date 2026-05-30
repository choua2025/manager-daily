import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import accountRoutes from './modules/accounts/accounts.routes';
import categoryRoutes from './modules/categories/categories.routes';
import paymentMethodRoutes from './modules/payment-methods/payment-methods.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
import budgetRoutes from './modules/budgets/budgets.routes';
import reportRoutes from './modules/reports/reports.routes';
import scheduleRoutes from './modules/schedules/schedules.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import userRoutes from './modules/users/users.routes';

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Security & parsing
app.use(helmet());

// CORS
const allowedOrigins = env.cors.origin;
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Root route for Render/browser check
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Manager Daily API is running',
    status: 'OK',
    health: '/health',
    apiBase: '/api',
    routes: {
      auth: '/api/auth',
      accounts: '/api/accounts',
      categories: '/api/categories',
      paymentMethods: '/api/payment-methods',
      transactions: '/api/transactions',
      budgets: '/api/budgets',
      reports: '/api/reports',
      schedules: '/api/schedules',
      notifications: '/api/notifications',
      users: '/api/users',
    },
  });
});

// HEAD route for Render health check
app.head('/', (_req, res) => {
  res.sendStatus(200);
});

// Optional robots route
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\n');
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({
    success: false,
    message: 'Route not found',
  })
);

// Global error handler
app.use(errorHandler);

export default app;