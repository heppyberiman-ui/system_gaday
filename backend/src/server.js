// Load environment variables first
require('dotenv').config();

const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database via Prisma...');
    await prisma.$connect();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.warn('\n⚠️  [Prisma] Database connection failed.');
    console.warn('Please verify your DATABASE_URL in the .env file.');
    console.warn(`Error Details: ${error.message}\n`);
  }

  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
