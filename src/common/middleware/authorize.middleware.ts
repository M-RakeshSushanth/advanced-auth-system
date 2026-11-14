import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission, ROLE_PERMISSIONS } from '../constants/roles.constant';
import { ForbiddenError, UnauthorizedError } from '../errors/http-errors';

/**
 * Middleware to restrict access to specific roles.
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`)
      );
    }

    next();
  };
};

/**
 * Middleware to restrict access by granular permissions.
 */
export const requirePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

    const hasAllRequired = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllRequired) {
      return next(
        new ForbiddenError(
          `Access denied. Requires permissions: [${requiredPermissions.join(', ')}]`
        )
      );
    }

    next();
  };
};
