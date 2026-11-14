import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { authRateLimiter } from '../../common/middleware/rate-limiter.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verify2FALoginSchema,
} from './auth.validation';

const router = Router();
const controller = new AuthController();

// Registration & Login
router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  controller.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  controller.login
);

// 2FA Login Verification
router.post(
  '/2fa/verify',
  authRateLimiter,
  validateRequest({ body: verify2FALoginSchema }),
  controller.verify2FALogin
);

// Token Refresh & Logout
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', controller.logout);

// Email Verification
router.get('/verify-email', controller.verifyEmail);
router.post(
  '/verify-email',
  validateRequest({ body: verifyEmailSchema }),
  controller.verifyEmail
);
router.post(
  '/resend-verification',
  authRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  controller.resendVerificationEmail
);

// Password Reset
router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  controller.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  controller.resetPassword
);

export const authRoutes = router;
