import { SessionRepository } from './session.repository';
import { ISession } from './session.model';
import { ForbiddenError, NotFoundError } from '../../common/errors/http-errors';
import { Session } from './session.model';

export class SessionService {
  constructor(private sessionRepository = new SessionRepository()) {}

  async getUserSessions(userId: string, currentSessionId?: string): Promise<any[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);
    return sessions.map((session) => ({
      id: session._id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session._id.toString() === currentSessionId,
    }));
  }

  async revokeSession(userId: string, targetSessionId: string, isAdmin = false): Promise<void> {
    const session = await this.sessionRepository.findById(targetSessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (!isAdmin && session.userId.toString() !== userId) {
      throw new ForbiddenError('You can only revoke your own sessions');
    }

    await this.sessionRepository.invalidateSession(targetSessionId);
  }

  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await Session.updateMany(
      {
        userId,
        _id: { $ne: currentSessionId },
        isValid: true,
      },
      { isValid: false }
    ).exec();
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.invalidateAllForUser(userId);
  }
}
