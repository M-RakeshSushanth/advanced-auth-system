import { Types } from 'mongoose';
import { UserRepository } from '../users/user.repository';
import { SessionRepository } from '../sessions/session.repository';
import { TwoFactorService } from '../twoFactor/twoFactor.service';
import { EmailService } from '../email/email.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { JwtUtil } from '../../common/utils/jwt.util';
import { env } from '../../config/env.config';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../common/errors/http-errors';
import { IUser } from '../users/user.model';
import { logger } from '../../config/logger';

export interface AuthSuccessResult {
  requires2FA: false;
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface Auth2FARequiredResult {
  requires2FA: true;
  tempToken: string;
}

export type LoginResult = AuthSuccessResult | Auth2FARequiredResult;

export class AuthService {
  constructor(
    private userRepository = new UserRepository(),
    private sessionRepository = new SessionRepository(),
    private twoFactorService = new TwoFactorService()
  ) {}

  /**
   * Registers a new user account and sends verification email.
   */
  async register(name: string, email: string, password: string): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists.');
    }

    // Generate single-use verification token
    const rawVerificationToken = CryptoUtil.generateRandomToken(32);
    const tokenHash = CryptoUtil.hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

    const user = await this.userRepository.create({
      name,
      email,
      password,
      isEmailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    });

    // Send verification email
    await EmailService.sendVerificationEmail(user.email, user.name, rawVerificationToken);

    return user;
  }

  /**
   * Verifies credentials, manages failed attempts / lockouts, and issues tokens or 2FA challenge.
   */
  async login(
    email: string,
    password: string,
    userAgent = 'Unknown Device',
    ipAddress = 'Unknown IP'
  ): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(
      email,
      '+password +failedLoginAttempts +lockUntil'
    );

    // Generic error to prevent user enumeration
    const invalidCredentialsError = new UnauthorizedError('Invalid email or password');

    if (!user || !user.password) {
      throw invalidCredentialsError;
    }

    // Check account lockout
    if (user.isLocked()) {
      const lockRemainingMinutes = Math.ceil(
        (user.lockUntil!.getTime() - Date.now()) / (60 * 1000)
      );
      throw new UnauthorizedError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockRemainingMinutes} minute(s).`
      );
    }

    // Check account active status
    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        throw new UnauthorizedError(
          'Too many failed login attempts. Account has been temporarily locked for 15 minutes.'
        );
      }

      await user.save();
      throw invalidCredentialsError;
    }

    // Reset failed login attempts on successful credentials
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      const tempToken = JwtUtil.sign2FAPendingToken({
        userId: user._id.toString(),
        email: user.email,
        purpose: '2fa_verification',
      });

      return {
        requires2FA: true,
        tempToken,
      };
    }

    // Issue tokens & establish session
    const { accessToken, refreshToken } = await this.createSessionAndTokens(
      user,
      userAgent,
      ipAddress
    );

    return {
      requires2FA: false,
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Completes 2FA login verification using TOTP code or backup code.
   */
  async verify2FALogin(
    tempToken: string,
    code: string,
    userAgent = 'Unknown Device',
    ipAddress = 'Unknown IP'
  ): Promise<AuthSuccessResult> {
    const payload = JwtUtil.verify2FAPendingToken(tempToken);
    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid user account');
    }

    const isValid = await this.twoFactorService.verifyCodeOrBackup(user._id.toString(), code);
    if (!isValid) {
      throw new UnauthorizedError('Invalid two-factor authentication or backup code');
    }

    // Issue tokens & establish session
    const { accessToken, refreshToken } = await this.createSessionAndTokens(
      user,
      userAgent,
      ipAddress
    );

    return {
      requires2FA: false,
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper: creates a session record in DB and signs JWT access & refresh tokens.
   */
  async createSessionAndTokens(
    user: IUser,
    userAgent: string,
    ipAddress: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = new Types.ObjectId();
    const tokenFamily = CryptoUtil.generateRandomToken(16);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshToken = JwtUtil.signRefreshToken({
      sessionId: sessionId.toString(),
      userId: user._id.toString(),
      tokenFamily,
    });
    const refreshTokenHash = CryptoUtil.hashToken(refreshToken);

    await this.sessionRepository.create({
      _id: sessionId,
      userId: user._id,
      refreshTokenHash,
      tokenFamily,
      userAgent,
      ipAddress,
      expiresAt,
    } as any);

    const accessToken = JwtUtil.signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: sessionId.toString(),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refreshes access token with Refresh Token Rotation and Reuse Detection.
   */
  async refreshAccessToken(
    incomingRefreshToken: string,
    userAgent = 'Unknown Device',
    ipAddress = 'Unknown IP'
  ): Promise<{ accessToken: string; newRefreshToken: string }> {
    // 1. Verify token signature and expiration
    const payload = JwtUtil.verifyRefreshToken(incomingRefreshToken);
    const incomingHash = CryptoUtil.hashToken(incomingRefreshToken);

    // 2. Fetch the session with refreshTokenHash
    const session = await this.sessionRepository.findById(payload.sessionId, '+refreshTokenHash');

    // REUSE DETECTION CASE 1: Session does not exist or was already invalidated
    if (!session || !session.isValid) {
      logger.warn(
        `[Security Alert] Refresh token reuse detected on invalidated session. Inactivating family ${payload.tokenFamily}`
      );
      // Invalidate all sessions in this token lineage / user
      await this.sessionRepository.invalidateTokenFamily(payload.tokenFamily);

      const user = await this.userRepository.findById(payload.userId);
      if (user) {
        await EmailService.sendSecurityAlertEmail(
          user.email,
          user.name,
          'Suspicious Authentication Activity Detected',
          'A previously rotated or revoked refresh token was re-submitted to your account. For your safety, all active sessions associated with this device lineage have been revoked.'
        );
      }

      throw new UnauthorizedError(
        'Security alert: Token reuse detected. Your session has been revoked for security reasons.'
      );
    }

    // REUSE DETECTION CASE 2: Token hash mismatch (an already rotated refresh token from this session is being replayed)
    if (session.refreshTokenHash !== incomingHash) {
      logger.warn(
        `[Security Alert] Refresh token reuse detected (hash mismatch). Inactivating session family ${session.tokenFamily}`
      );
      // Immediately invalidate the session and its entire lineage
      await this.sessionRepository.invalidateTokenFamily(session.tokenFamily);

      const user = await this.userRepository.findById(payload.userId);
      if (user) {
        await EmailService.sendSecurityAlertEmail(
          user.email,
          user.name,
          'Suspicious Authentication Activity Detected',
          'A previously rotated or revoked refresh token was re-submitted to your account. For your safety, all active sessions associated with this device lineage have been revoked.'
        );
      }

      throw new UnauthorizedError(
        'Security alert: Token reuse detected. Your session has been revoked for security reasons.'
      );
    }

    // 3. Verify user
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      await this.sessionRepository.invalidateSession(session._id.toString());
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // 4. REFRESH TOKEN ROTATION:
    // Generate new access token and new refresh token
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newRefreshToken = JwtUtil.signRefreshToken({
      sessionId: session._id.toString(),
      userId: user._id.toString(),
      tokenFamily: session.tokenFamily,
    });
    const newRefreshTokenHash = CryptoUtil.hashToken(newRefreshToken);

    // Update the session record with the new hashed refresh token
    await this.sessionRepository.updateRefreshToken(
      session._id.toString(),
      newRefreshTokenHash,
      newExpiresAt
    );

    const accessToken = JwtUtil.signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session._id.toString(),
    });

    return {
      accessToken,
      newRefreshToken,
    };
  }

  /**
   * Logs out the user by invalidating the session.
   */
  async logout(refreshToken?: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionRepository.invalidateSession(sessionId);
      return;
    }

    if (refreshToken) {
      try {
        const payload = JwtUtil.verifyRefreshToken(refreshToken);
        await this.sessionRepository.invalidateSession(payload.sessionId);
      } catch (err) {
        // In case token is already invalid, proceed silently
      }
    }
  }

  /**
   * Verifies user email with single-use verification token.
   */
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = CryptoUtil.hashToken(rawToken);
    const user = await this.userRepository.findByVerificationTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestError('Invalid or expired email verification link');
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
  }

  /**
   * Resends email verification link with rate-limiting & anti-enumeration.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.isEmailVerified) {
      // Return cleanly to prevent email enumeration
      return;
    }

    const rawVerificationToken = CryptoUtil.generateRandomToken(32);
    const tokenHash = CryptoUtil.hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = expiresAt;
    await user.save();

    await EmailService.sendVerificationEmail(user.email, user.name, rawVerificationToken);
  }

  /**
   * Initiates password reset request with anti-enumeration.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Generic return to prevent email enumeration
      return;
    }

    const rawResetToken = CryptoUtil.generateRandomToken(32);
    const tokenHash = CryptoUtil.hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    await EmailService.sendPasswordResetEmail(user.email, user.name, rawResetToken);
  }

  /**
   * Resets password using valid token and revokes all active sessions.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = CryptoUtil.hashToken(rawToken);
    const user = await this.userRepository.findByPasswordResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset link');
    }

    user.password = newPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    // Revoke all existing sessions on password reset for security
    await this.sessionRepository.invalidateAllForUser(user._id.toString());

    await EmailService.sendSecurityAlertEmail(
      user.email,
      user.name,
      'Password Changed Successfully',
      'The password for your account was recently reset. If you did not perform this action, please contact support immediately.'
    );
  }
}
