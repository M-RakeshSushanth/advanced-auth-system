import http from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env.config';
import { logger } from './config/logger';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start listening
    server.listen(env.PORT, () => {
      logger.info(`================================================`);
      logger.info(`  ${env.APP_NAME} is running`);
      logger.info(`  Environment: ${env.NODE_ENV}`);
      logger.info(`  Listening on port: ${env.PORT}`);
      logger.info(`  API Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`  Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`================================================`);
    });

    // 4. Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        logger.info('Database connections closed. Process terminating cleanly.');
        process.exit(0);
      });

      // Force close if graceful shutdown takes longer than 10 seconds
      setTimeout(() => {
        logger.error('Forceful shutdown after 10s timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection detected:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception detected:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start application server:', error);
    process.exit(1);
  }
};

startServer();
