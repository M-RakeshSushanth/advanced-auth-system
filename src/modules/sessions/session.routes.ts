import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';

const router = Router();
const controller = new SessionController();

// All session endpoints require authentication
router.use(authenticate);

router.get('/', controller.getSessions);
router.delete('/others', controller.revokeOtherSessions);
router.delete('/all', controller.revokeAllSessions);
router.delete('/:sessionId', controller.revokeSession);

export const sessionRoutes = router;
