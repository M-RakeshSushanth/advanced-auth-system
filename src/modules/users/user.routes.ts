import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requireRoles } from '../../common/middleware/authorize.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import {
  updateProfileSchema,
  updatePasswordSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userQuerySchema,
} from './user.validation';
import { UserRole } from '../../common/constants/roles.constant';

const router = Router();
const controller = new UserController();

// All user routes require authentication
router.use(authenticate);

// Current user profile endpoints
router.get('/me', controller.getProfile);
router.put('/me', validateRequest({ body: updateProfileSchema }), controller.updateProfile);
router.post(
  '/me/change-password',
  validateRequest({ body: updatePasswordSchema }),
  controller.changePassword
);

// Admin user management endpoints
router.get(
  '/',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ query: userQuerySchema }),
  controller.listUsers
);

router.get(
  '/:id',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  controller.getUserById
);

// Super Admin: Role update
router.patch(
  '/:id/role',
  requireRoles(UserRole.SUPER_ADMIN),
  validateRequest({ body: updateUserRoleSchema }),
  controller.updateUserRole
);

// Admin & Super Admin: Account status (active/deactive)
router.patch(
  '/:id/status',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ body: updateUserStatusSchema }),
  controller.updateUserStatus
);

export const userRoutes = router;
