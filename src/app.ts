import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.config';
import { requestLogger } from './common/middleware/request-logger.middleware';
import { globalRateLimiter } from './common/middleware/rate-limiter.middleware';
import { notFoundHandler } from './common/middleware/not-found.middleware';
import { errorHandler } from './common/middleware/error.middleware';
import { ApiResponse } from './common/utils/api-response.util';
import { HttpStatus } from './common/constants/http-status.constant';

// Import module routes
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import { twoFactorRoutes } from './modules/twoFactor/twoFactor.routes';
import { oauthRoutes } from './modules/oauth/oauth.routes';
import { authorizationRoutes } from './modules/authorization/authorization.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Trust proxy if behind a reverse proxy (e.g. nginx, cloudflare, heroku)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        const allowedOrigins = [env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'];
        if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Refresh-Token'],
    })
  );

  // Request parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Request Logging
  app.use(requestLogger);

  // Global Rate Limiting
  app.use(globalRateLimiter);

  // System Health Check
  app.get('/health', (_req, res) => {
    ApiResponse.success(
      res,
      'System is healthy and operational',
      {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      },
      HttpStatus.OK
    );
  });

  // Mount API Modules
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/sessions`, sessionRoutes);
  app.use(`${prefix}/2fa`, twoFactorRoutes);
  app.use(`${prefix}/oauth`, oauthRoutes);
  app.use(`${prefix}/authorization`, authorizationRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
