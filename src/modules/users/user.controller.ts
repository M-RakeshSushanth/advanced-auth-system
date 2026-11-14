import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ApiResponse } from '../../common/utils/api-response.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';
import { UserRole } from '../../common/constants/roles.constant';

export class UserController {
  constructor(private userService = new UserService()) {}

  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const user = await this.userService.getProfile(userId);
    ApiResponse.success(res, 'Profile retrieved successfully', user, HttpStatus.OK);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { name } = req.body;
    const updatedUser = await this.userService.updateProfile(userId, { name });
    ApiResponse.success(res, 'Profile updated successfully', updatedUser, HttpStatus.OK);
  });

  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { currentPassword, newPassword } = req.body;
    await this.userService.changePassword(userId, currentPassword, newPassword);
    ApiResponse.success(res, 'Password changed successfully. All other sessions have been logged out.', null, HttpStatus.OK);
  });

  // Admin: List all users
  listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const role = req.query.role as UserRole | undefined;
    const search = req.query.search as string | undefined;

    const result = await this.userService.getAllUsers(page, limit, role, search);
    ApiResponse.success(res, 'Users retrieved successfully', result.users, HttpStatus.OK, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  });

  // Admin: Get user by ID
  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await this.userService.getUserById(id);
    ApiResponse.success(res, 'User details retrieved successfully', user, HttpStatus.OK);
  });

  // Super Admin: Update user role
  updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const operatorUserId = req.user!._id.toString();
    const { id } = req.params;
    const { role } = req.body;

    const user = await this.userService.updateUserRole(operatorUserId, id, role);
    ApiResponse.success(res, `User role updated to ${role} successfully`, user, HttpStatus.OK);
  });

  // Admin: Activate / Deactivate user
  updateUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const operatorUserId = req.user!._id.toString();
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await this.userService.updateUserStatus(operatorUserId, id, isActive);
    const action = isActive ? 'activated' : 'deactivated';
    ApiResponse.success(res, `User account ${action} successfully`, user, HttpStatus.OK);
  });
}
