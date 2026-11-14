import { Router } from 'express';
import { OAuthController } from './oauth.controller';
import { authRateLimiter } from '../../common/middleware/rate-limiter.middleware';

const router = Router();
const controller = new OAuthController();

router.get('/google', controller.getGoogleAuthUrl);
router.get('/google/callback', controller.googleCallback);
router.post('/google/token', authRateLimiter, controller.googleTokenLogin);

export const oauthRoutes = router;
