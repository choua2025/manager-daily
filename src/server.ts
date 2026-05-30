import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const PORT = Number(process.env.PORT) || 10000;

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${env.nodeEnv}`);
    });

    server.on('error', (error) => {
      console.error('❌ Server listen error:', error);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

main();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});