import { UserRepository } from './user.repository';
import { IUser } from './user.model';
import { UserRole } from '../../common/constants/roles.constant';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/http-errors';
import { SessionRepository } from '../sessions/session.repository';

export class UserService {
  constructor(
    private userRepository = new UserRepository(),
    private sessionRepository = new SessionRepository()
  ) {}

  async getProfile(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: { name?: string }): Promise<IUser> {
    const user = await this.userRepository.updateById(userId, updateData);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId, '+password');
    if (!user || !user.password) {
      throw new BadRequestError('Cannot change password for this account');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match');
    }

    user.password = newPassword;
    await user.save();

    // Revoke other active sessions for security
    await this.sessionRepository.invalidateAllForUser(userId);
  }

  async getAllUsers(
    page = 1,
    limit = 20,
    role?: UserRole,
    search?: string
  ): Promise<{ users: IUser[]; total: number; page: number; totalPages: number }> {
    const filter: any = {};
    if (role) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const { users, total } = await this.userRepository.find(filter, skip, limit);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateUserRole(operatorUserId: string, targetUserId: string, newRole: UserRole): Promise<IUser> {
    if (operatorUserId === targetUserId) {
      throw new ForbiddenError('You cannot alter your own role');
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    targetUser.role = newRole;
    await targetUser.save();

    // Invalidate sessions so new role is reflected on next login/token
    await this.sessionRepository.invalidateAllForUser(targetUserId);

    return targetUser;
  }

  async updateUserStatus(operatorUserId: string, targetUserId: string, isActive: boolean): Promise<IUser> {
    if (operatorUserId === targetUserId && !isActive) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    if (!isActive) {
      // Invalidate all active sessions immediately
      await this.sessionRepository.invalidateAllForUser(targetUserId);
    }

    return targetUser;
  }
}
