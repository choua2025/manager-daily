import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  // Test database connection
  await prisma.$connect();
  console.log('✅ Database connected');

  app.listen(env.port, () => {
    console.log(`🚀 Server running on http://${env.host}:${env.port}`);
    console.log(`📊 Environment: ${env.nodeEnv}`);
  });
}


main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
