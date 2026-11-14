import { Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { ApiResponse } from '../../common/utils/api-response.util';
import { CookieUtil } from '../../common/utils/cookie.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';
import { env } from '../../config/env.config';
import { BadRequestError } from '../../common/errors/http-errors';

export class OAuthController {
  constructor(private oauthService = new OAuthService()) {}

  getGoogleAuthUrl = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const url = this.oauthService.getGoogleAuthUrl();
    ApiResponse.success(res, 'Google authorization URL generated', { url }, HttpStatus.OK);
  });

  googleCallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    if (!code) {
      throw new BadRequestError('Authorization code is missing from callback query');
    }

    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';

    const result = await this.oauthService.handleGoogleCallback(code, userAgent, ipAddress);

    // Set refresh token cookie
    CookieUtil.setRefreshTokenCookie(res, result.refreshToken);

    // If client requested JSON (e.g. API client), return JSON; otherwise redirect to frontend
    const acceptsHtml = req.headers.accept?.includes('text/html');
    if (acceptsHtml && env.CLIENT_URL) {
      // Redirect to frontend auth callback with access token in fragment or query
      res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${result.accessToken}`);
      return;
    }

    ApiResponse.success(
      res,
      'Google authentication successful',
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      HttpStatus.OK
    );
  });

  googleTokenLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    if (!idToken) {
      throw new BadRequestError('idToken is required');
    }

    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown IP';

    const result = await this.oauthService.verifyGoogleIdTokenAndLogin(idToken, userAgent, ipAddress);

    CookieUtil.setRefreshTokenCookie(res, result.refreshToken);

    ApiResponse.success(
      res,
      'Google authentication successful',
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      HttpStatus.OK
    );
  });
}
