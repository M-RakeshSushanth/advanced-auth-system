import request from 'supertest';
import { createApp } from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { Session } from '../../src/modules/sessions/session.model';
import { Application } from 'express';
import { CryptoUtil } from '../../src/common/utils/crypto.util';

describe('Auth Module Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(validUser.email);
      expect(res.body.data.password).toBeUndefined();

      const userInDb = await User.findOne({ email: validUser.email }).select('+emailVerificationTokenHash');
      expect(userInDb).toBeDefined();
      expect(userInDb?.isEmailVerified).toBe(false);
      expect(userInDb?.emailVerificationTokenHash).toBeDefined();
    });

    it('should reject registration if email is already taken', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration if password does not meet complexity requirements', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'simplepassword', // No uppercase, no number, no symbol
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should authenticate user and return access token and set refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should lock account after 5 consecutive failed attempts', async () => {
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: validUser.email, password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }

      // 5th attempt triggers lockout
      const fifthRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: 'WrongPassword!' });

      expect(fifthRes.status).toBe(401);
      expect(fifthRes.body.message).toContain('locked');

      const userInDb = await User.findOne({ email: validUser.email });
      expect(userInDb?.isLocked()).toBe(true);
    });
  });

  describe('Refresh Token Rotation & Reuse Detection', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should rotate refresh token on valid refresh request', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      const cookie = loginRes.headers['set-cookie'][0];

      // Request new token using refresh cookie
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', cookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookie = refreshRes.headers['set-cookie'][0];
      expect(newCookie).toBeDefined();
      expect(newCookie).not.toEqual(cookie);
    });

    it('REUSE DETECTION: Replaying old refresh token should invalidate entire session family', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      const firstCookie = loginRes.headers['set-cookie'][0];

      // Legitimate user rotates token (First Rotation)
      const firstRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', firstCookie);

      expect(firstRefresh.status).toBe(200);
      const secondCookie = firstRefresh.headers['set-cookie'][0];

      // ATTACK SCENARIO: Malicious actor / replay of the old firstCookie
      const replayAttempt = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', firstCookie);

      expect(replayAttempt.status).toBe(401);
      expect(replayAttempt.body.message).toContain('reuse detected');

      // Now the legitimate secondCookie should also be revoked because the entire family was invalidated!
      const subsequentLegitAttempt = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', secondCookie);

      expect(subsequentLegitAttempt.status).toBe(401);

      // Verify in DB that sessions in that family are invalid
      const sessions = await Session.find({ isValid: true });
      expect(sessions.length).toBe(0);
    });
  });

  describe('Email Verification Workflow', () => {
    it('should verify email address when correct token is supplied', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);

      // In real workflow, token was sent via email. Let's retrieve user and simulate clicking email link.
      const rawToken = 'test-verification-token-123';
      const tokenHash = CryptoUtil.hashToken(rawToken);

      await User.findOneAndUpdate(
        { email: validUser.email },
        {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      );

      const res = await request(app)
        .get(`/api/v1/auth/verify-email?token=${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await User.findOne({ email: validUser.email });
      expect(user?.isEmailVerified).toBe(true);
    });
  });

  describe('Password Reset Workflow', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('should accept forgot-password request without enumerating user existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: validUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Non-existent email returns same response
      const resNonExistent = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(resNonExistent.status).toBe(200);
      expect(resNonExistent.body.success).toBe(true);
    });

    it('should reset password with valid token and revoke all active sessions', async () => {
      // 1. Establish an active session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      const oldAccessToken = loginRes.body.data.accessToken;

      // 2. Simulate password reset token in DB
      const rawResetToken = 'super-secret-reset-token';
      const tokenHash = CryptoUtil.hashToken(rawResetToken);

      await User.findOneAndUpdate(
        { email: validUser.email },
        {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        }
      );

      // 3. Reset password
      const newPassword = 'NewSecurePassword123#';
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawResetToken,
          newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 4. Verify previous access token fails because session was revoked
      const profileCheck = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${oldAccessToken}`);

      expect(profileCheck.status).toBe(401);

      // 5. Verify new password works for login
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUser.email,
          password: newPassword,
        });

      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.accessToken).toBeDefined();
    });
  });
});
