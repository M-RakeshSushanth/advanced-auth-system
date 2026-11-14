import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.config';
import { TooManyRequestsError } from '../errors/http-errors';

// Global API rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many requests from this IP, please try again after 15 minutes'));
  },
  skip: () => env.NODE_ENV === 'test',
});

// Strict rate limiter for sensitive authentication endpoints (login, register, forgot-password, 2fa)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts. Please try again after 15 minutes'));
  },
  skip: () => env.NODE_ENV === 'test',
});
