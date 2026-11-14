import { UserRole } from '../constants/roles.constant';

export interface JwtAccessPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface JwtRefreshPayload {
  sessionId: string;
  userId: string;
  tokenFamily: string;
}

export interface Jwt2FAPendingPayload {
  userId: string;
  email: string;
  purpose: '2fa_verification';
}
