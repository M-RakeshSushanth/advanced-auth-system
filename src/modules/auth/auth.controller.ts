import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../common/utils/api-response.util';
import { CookieUtil } from '../../common/utils/cookie.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';
import { env } from '../../config/env.config';
import { BadRequestError, UnauthorizedError } from '../../common/errors/http-errors';

export class AuthController {
  constructor(private authService = new AuthService()) {}

  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    const user = await this.authService.register(name, email, password);

    ApiResponse.success(
      res,
      'Registration successful. Please check your email for the verification link.',
      user,
      HttpStatus.CREATED
    );
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';

    const result = await this.authService.login(email, password, userAgent, ipAddress);

    if (result.requires2FA) {
      ApiResponse.success(
        res,
        'Two-factor authentication required. Please enter your 6-digit TOTP code or backup code.',
        {
          requires2FA: true,
          tempToken: result.tempToken,
        },
        HttpStatus.OK
      );
      return;
    }

    // Set HTTP-only refresh token cookie
    CookieUtil.setRefreshTokenCookie(res, result.refreshToken);

    ApiResponse.success(
      res,
      'Login successful',
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      HttpStatus.OK
    );
  });

  verify2FALogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tempToken, code } = req.body;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';

    const result = await this.authService.verify2FALogin(tempToken, code, userAgent, ipAddress);

    CookieUtil.setRefreshTokenCookie(res, result.refreshToken);

    ApiResponse.success(
      res,
      'Two-factor verification successful. Logged in.',
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      HttpStatus.OK
    );
  });

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token =
      req.cookies?.[env.REFRESH_COOKIE_NAME] ||
      (req.headers['x-refresh-token'] as string) ||
      req.body?.refreshToken;

    if (!token) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';

    try {
      const result = await this.authService.refreshAccessToken(token, userAgent, ipAddress);

      // Rotate cookie
      CookieUtil.setRefreshTokenCookie(res, result.newRefreshToken);

      ApiResponse.success(
        res,
        'Access token refreshed successfully',
        {
          accessToken: result.accessToken,
        },
        HttpStatus.OK
      );
    } catch (error) {
      // Clear cookie on failure/reuse
      CookieUtil.clearRefreshTokenCookie(res);
      throw error;
    }
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token =
      req.cookies?.[env.REFRESH_COOKIE_NAME] ||
      (req.headers['x-refresh-token'] as string) ||
      req.body?.refreshToken;

    const sessionId = req.session?._id?.toString();

    await this.authService.logout(token, sessionId);
    CookieUtil.clearRefreshTokenCookie(res);

    ApiResponse.success(res, 'Logged out successfully', null, HttpStatus.OK);
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token = req.query.token as string || req.body?.token;
    if (!token) {
      throw new BadRequestError('Verification token is required');
    }

    await this.authService.verifyEmail(token);

    ApiResponse.success(res, 'Email address has been successfully verified. You may now log in.', null, HttpStatus.OK);
  });

  resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    await this.authService.resendVerificationEmail(email);

    ApiResponse.success(
      res,
      'If an unverified account with this email exists, a new verification link has been sent.',
      null,
      HttpStatus.OK
    );
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    await this.authService.forgotPassword(email);

    ApiResponse.success(
      res,
      'If an account with this email exists, a password reset link has been sent.',
      null,
      HttpStatus.OK
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;
    await this.authService.resetPassword(token, newPassword);

    ApiResponse.success(
      res,
      'Password reset successful. All active sessions have been revoked. Please log in with your new password.',
      null,
      HttpStatus.OK
    );
  });
}
