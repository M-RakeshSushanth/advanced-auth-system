import { Router } from 'express';
import { TwoFactorController } from './twoFactor.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { verifyTotpSetupSchema, disableTotpSchema } from './twoFactor.validation';

const router = Router();
const controller = new TwoFactorController();

// All 2FA management routes require authentication
router.use(authenticate);

router.post('/setup', controller.generateSetup);
router.post('/enable', validateRequest({ body: verifyTotpSetupSchema }), controller.enable2FA);
router.post('/disable', validateRequest({ body: disableTotpSchema }), controller.disable2FA);
router.post(
  '/regenerate-backup-codes',
  validateRequest({ body: verifyTotpSetupSchema }),
  controller.regenerateBackupCodes
);

export const twoFactorRoutes = router;
