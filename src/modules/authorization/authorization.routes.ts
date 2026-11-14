import { Router } from 'express';
import { AuthorizationController } from './authorization.controller';
import { authenticate } from '../../common/middleware/authenticate.middleware';
import { requireRoles, requirePermissions } from '../../common/middleware/authorize.middleware';
import { UserRole, Permission } from '../../common/constants/roles.constant';

const router = Router();
const controller = new AuthorizationController();

router.use(authenticate);

// Inspect permissions
router.get('/my-permissions', controller.getMyPermissions);
router.get(
  '/roles-matrix',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  controller.getAllRolesAndPermissions
);

// Protected resource requiring ADMIN or SUPER_ADMIN
router.get(
  '/admin-only',
  requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  controller.adminResource
);

// Protected resource requiring SUPER_ADMIN or specific permission
router.get(
  '/super-admin-only',
  requireRoles(UserRole.SUPER_ADMIN),
  requirePermissions(Permission.ROLES_MANAGE, Permission.SECURITY_AUDIT),
  controller.superAdminResource
);

export const authorizationRoutes = router;
