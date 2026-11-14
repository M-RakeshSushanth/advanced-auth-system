import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.config';
import { UserRepository } from '../users/user.repository';
import { AuthService } from '../auth/auth.service';
import { BadRequestError, UnauthorizedError } from '../../common/errors/http-errors';
import { IUser } from '../users/user.model';
import { logger } from '../../config/logger';

export class OAuthService {
  private oauthClient: OAuth2Client;

  constructor(
    private userRepository = new UserRepository(),
    private authService = new AuthService()
  ) {
    this.oauthClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL
    );
  }

  /**
   * Generates the Google OAuth 2.0 authorization URL.
   */
  getGoogleAuthUrl(): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
      ],
    });
  }

  /**
   * Exchanges an authorization code for tokens, verifies Google identity,
   * creates/links the user account, and issues internal application tokens.
   */
  async handleGoogleCallback(
    code: string,
    userAgent = 'Unknown Device',
    ipAddress = 'Unknown IP'
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured in this environment');
    }

    try {
      const { tokens } = await this.oauthClient.getToken(code);
      this.oauthClient.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new UnauthorizedError('Failed to obtain Google ID token');
      }

      const ticket = await this.oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedError('Google profile did not contain a valid email address');
      }

      const { sub: googleId, email, name } = payload;
      return this.findOrCreateAndAuthenticate(
        googleId,
        email,
        name || email.split('@')[0],
        userAgent,
        ipAddress
      );
    } catch (error: any) {
      logger.error('Google OAuth callback error:', error);
      throw new UnauthorizedError('Google OAuth authentication failed: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Verifies an ID token passed directly from an SPA / mobile frontend.
   */
  async verifyGoogleIdTokenAndLogin(
    idToken: string,
    userAgent = 'Unknown Device',
    ipAddress = 'Unknown IP'
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new BadRequestError('Google OAuth is not configured in this environment');
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedError('Invalid Google token payload');
      }

      const { sub: googleId, email, name } = payload;
      return this.findOrCreateAndAuthenticate(
        googleId,
        email,
        name || email.split('@')[0],
        userAgent,
        ipAddress
      );
    } catch (error: any) {
      logger.error('Google ID token verification failed:', error);
      throw new UnauthorizedError('Invalid Google ID token');
    }
  }

  /**
   * Internal helper to find/link/create user and issue internal tokens.
   */
  private async findOrCreateAndAuthenticate(
    googleId: string,
    email: string,
    name: string,
    userAgent: string,
    ipAddress: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    // 1. Try finding by Google ID
    let user = await this.userRepository.findByGoogleId(googleId);

    // 2. If not found by googleId, check by email
    if (!user) {
      user = await this.userRepository.findByEmail(email);

      if (user) {
        // Link Google ID and mark email verified since Google already verified it
        user.googleId = googleId;
        user.isEmailVerified = true;
        await user.save();
      } else {
        // Create new account
        user = await this.userRepository.create({
          name,
          email,
          googleId,
          isEmailVerified: true,
          isActive: true,
        });
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated. Please contact support.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Establish session and issue internal tokens
    const { accessToken, refreshToken } = await this.authService.createSessionAndTokens(
      user,
      userAgent,
      ipAddress
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }
}
