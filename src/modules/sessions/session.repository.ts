import { Session, ISession } from './session.model';
import { Types } from 'mongoose';

export class SessionRepository {
  async create(sessionData: {
    userId: string | Types.ObjectId;
    refreshTokenHash: string;
    tokenFamily: string;
    userAgent: string;
    ipAddress: string;
    expiresAt: Date;
  }): Promise<ISession> {
    const session = new Session(sessionData);
    return session.save();
  }

  async findById(id: string, selectFields?: string): Promise<ISession | null> {
    const query = Session.findById(id);
    if (selectFields) {
      query.select(selectFields);
    }
    return query.exec();
  }

  async findByTokenHash(refreshTokenHash: string): Promise<ISession | null> {
    return Session.findOne({ refreshTokenHash }).select('+refreshTokenHash').exec();
  }

  async findActiveByUserId(userId: string): Promise<ISession[]> {
    return Session.find({
      userId,
      isValid: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateRefreshToken(
    sessionId: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date
  ): Promise<ISession | null> {
    return Session.findByIdAndUpdate(
      sessionId,
      {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
      { new: true }
    ).exec();
  }

  async invalidateSession(sessionId: string): Promise<ISession | null> {
    return Session.findByIdAndUpdate(sessionId, { isValid: false }, { new: true }).exec();
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await Session.updateMany({ userId, isValid: true }, { isValid: false }).exec();
  }

  async invalidateTokenFamily(tokenFamily: string): Promise<void> {
    await Session.updateMany({ tokenFamily, isValid: true }, { isValid: false }).exec();
  }
}
