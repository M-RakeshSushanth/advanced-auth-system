import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('Advanced Auth System'),
  CLIENT_URL: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/advanced-auth-db'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_2FA_SECRET: z.string().min(16),
  JWT_2FA_EXPIRES_IN: z.string().default('5m'),

  COOKIE_SECRET: z.string().min(16),
  REFRESH_COOKIE_NAME: z.string().default('refreshToken'),

  TOTP_ENCRYPTION_KEY: z.string().min(32).describe('32-byte hex or 32+ char key for AES-256'),
  TOTP_APP_NAME: z.string().default('AdvancedAuth'),

  EMAIL_SERVICE_MODE: z.enum(['ethereal', 'smtp', 'console', 'mock']).default('ethereal'),
  SMTP_HOST: z.string().optional().default('smtp.ethereal.email'),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).default('587'),
  SMTP_SECURE: z.string().transform((val) => val === 'true').default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Advanced Auth <no-reply@authsystem.local>'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/oauth/google/callback'),

  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('10'),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.string().transform((val) => parseInt(val, 10)).default('15'),
  EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS: z.string().transform((val) => parseInt(val, 10)).default('24'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
