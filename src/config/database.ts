import mongoose from 'mongoose';
import { env } from './env.config';
import { logger } from './logger';

export const connectDatabase = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || env.MONGODB_URI;

  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(connectionUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`MongoDB connected successfully to ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});
