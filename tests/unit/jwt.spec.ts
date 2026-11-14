import { JwtUtil } from '../../src/common/utils/jwt.util';
import { UserRole } from '../../src/common/constants/roles.constant';
import { UnauthorizedError } from '../../src/common/errors/http-errors';

describe('JwtUtil', () => {
  const mockAccessPayload = {
    userId: '60d0fe4f5311236168a109ca',
    email: 'test@example.com',
    role: UserRole.USER,
    sessionId: '60d0fe4f5311236168a109cb',
  };

  const mockRefreshPayload = {
    sessionId: '60d0fe4f5311236168a109cb',
    userId: '60d0fe4f5311236168a109ca',
    tokenFamily: 'family-xyz',
  };

  it('should sign and verify access token correctly', () => {
    const token = JwtUtil.signAccessToken(mockAccessPayload);
    expect(typeof token).toBe('string');

    const decoded = JwtUtil.verifyAccessToken(token);
    expect(decoded.userId).toBe(mockAccessPayload.userId);
    expect(decoded.email).toBe(mockAccessPayload.email);
    expect(decoded.role).toBe(mockAccessPayload.role);
    expect(decoded.sessionId).toBe(mockAccessPayload.sessionId);
  });

  it('should sign and verify refresh token correctly', () => {
    const token = JwtUtil.signRefreshToken(mockRefreshPayload);
    expect(typeof token).toBe('string');

    const decoded = JwtUtil.verifyRefreshToken(token);
    expect(decoded.sessionId).toBe(mockRefreshPayload.sessionId);
    expect(decoded.userId).toBe(mockRefreshPayload.userId);
    expect(decoded.tokenFamily).toBe(mockRefreshPayload.tokenFamily);
  });

  it('should sign and verify 2FA pending token correctly', () => {
    const token = JwtUtil.sign2FAPendingToken({
      userId: '60d0fe4f5311236168a109ca',
      email: 'test@example.com',
      purpose: '2fa_verification',
    });

    const decoded = JwtUtil.verify2FAPendingToken(token);
    expect(decoded.userId).toBe('60d0fe4f5311236168a109ca');
    expect(decoded.purpose).toBe('2fa_verification');
  });

  it('should throw UnauthorizedError when verifying corrupted token', () => {
    expect(() => {
      JwtUtil.verifyAccessToken('invalid.jwt.token');
    }).toThrow(UnauthorizedError);
  });
});
