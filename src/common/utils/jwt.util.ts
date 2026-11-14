import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { JwtAccessPayload, JwtRefreshPayload, Jwt2FAPendingPayload } from '../types/token.types';
import { UnauthorizedError } from '../errors/http-errors';
import { CryptoUtil } from './crypto.util';

export class JwtUtil {
  /**
   * Generates a short-lived access token.
   */
  static signAccessToken(payload: JwtAccessPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
      issuer: env.APP_NAME,
      audience: env.CLIENT_URL,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Generates a long-lived refresh token.
   */
  static signRefreshToken(payload: JwtRefreshPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
      issuer: env.APP_NAME,
      audience: env.CLIENT_URL,
      jwtid: CryptoUtil.generateRandomToken(16),
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  }

  /**
   * Generates a temporary 2FA pending token.
   */
  static sign2FAPendingToken(payload: Jwt2FAPendingPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_2FA_EXPIRES_IN as any,
      issuer: env.APP_NAME,
      audience: env.CLIENT_URL,
    };
    return jwt.sign(payload, env.JWT_2FA_SECRET, options);
  }

  /**
   * Verifies an access token and returns its payload.
   */
  static verifyAccessToken(token: string): JwtAccessPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: env.APP_NAME,
        audience: env.CLIENT_URL,
      }) as JwtAccessPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid or corrupted access token');
    }
  }

  /**
   * Verifies a refresh token and returns its payload.
   */
  static verifyRefreshToken(token: string): JwtRefreshPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: env.APP_NAME,
        audience: env.CLIENT_URL,
      }) as JwtRefreshPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired');
      }
      throw new UnauthorizedError('Invalid or corrupted refresh token');
    }
  }

  /**
   * Verifies a 2FA pending verification token.
   */
  static verify2FAPendingToken(token: string): Jwt2FAPendingPayload {
    try {
      return jwt.verify(token, env.JWT_2FA_SECRET, {
        issuer: env.APP_NAME,
        audience: env.CLIENT_URL,
      }) as Jwt2FAPendingPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Two-factor verification window has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid or corrupted 2FA token');
    }
  }
}
