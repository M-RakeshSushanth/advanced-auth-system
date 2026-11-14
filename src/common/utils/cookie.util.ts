import { Response, CookieOptions } from 'express';
import { env } from '../../config/env.config';

export class CookieUtil {
  private static getCookieOptions(): CookieOptions {
    const isProduction = env.NODE_ENV === 'production';
    // 7 days in milliseconds
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge,
    };
  }

  static setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, this.getCookieOptions());
  }

  static clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(env.REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });
  }
}
