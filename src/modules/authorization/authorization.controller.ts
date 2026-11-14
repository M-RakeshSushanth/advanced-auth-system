import { Request, Response } from 'express';
import { ApiResponse } from '../../common/utils/api-response.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';
import { ROLE_PERMISSIONS, UserRole, Permission } from '../../common/constants/roles.constant';

export class AuthorizationController {
  getMyPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const role = req.user!.role;
    const permissions = ROLE_PERMISSIONS[role] || [];

    ApiResponse.success(
      res,
      'User permissions retrieved successfully',
      {
        role,
        permissions,
      },
      HttpStatus.OK
    );
  });

  getAllRolesAndPermissions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const roles = Object.values(UserRole);
    const permissions = Object.values(Permission);

    ApiResponse.success(
      res,
      'System roles and permission matrix',
      {
        roles,
        permissions,
        matrix: ROLE_PERMISSIONS,
      },
      HttpStatus.OK
    );
  });

  adminResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    ApiResponse.success(
      res,
      'Access granted to Admin-protected resource',
      {
        accessedBy: req.user!.email,
        role: req.user!.role,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.OK
    );
  });

  superAdminResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    ApiResponse.success(
      res,
      'Access granted to Super Admin-protected resource',
      {
        accessedBy: req.user!.email,
        role: req.user!.role,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.OK
    );
  });
}
