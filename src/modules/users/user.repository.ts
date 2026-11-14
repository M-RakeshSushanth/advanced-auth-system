import { User, IUser } from './user.model';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class UserRepository {
  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async findById(id: string, selectFields?: string): Promise<IUser | null> {
    const query = User.findById(id);
    if (selectFields) {
      query.select(selectFields);
    }
    return query.exec();
  }

  async findByEmail(email: string, selectFields?: string): Promise<IUser | null> {
    const query = User.findOne({ email: email.toLowerCase() });
    if (selectFields) {
      query.select(selectFields);
    }
    return query.exec();
  }

  async findByVerificationTokenHash(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash');
  }

  async findByPasswordResetTokenHash(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash');
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return User.findOne({ googleId });
  }

  async find(filter: FilterQuery<IUser> = {}, skip = 0, limit = 20): Promise<{ users: IUser[]; total: number }> {
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      User.countDocuments(filter),
    ]);
    return { users, total };
  }

  async updateById(id: string, updateData: UpdateQuery<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
  }

  async deleteById(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id).exec();
  }
}
