import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UnauthorizedError } from '../errors/http-errors';
import { User } from '../../modules/users/user.model';
import { Session } from '../../modules/sessions/session.model';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token is missing');
    }

    // Verify token
    const payload = JwtUtil.verifyAccessToken(token);

    // Verify session
    const session = await Session.findById(payload.sessionId);
    if (!session || !session.isValid) {
      throw new UnauthorizedError('Session has been revoked or expired. Please log in again.');
    }

    // Verify user
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
    }

    // Attach to request
    req.user = user;
    req.tokenPayload = payload;
    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
};
