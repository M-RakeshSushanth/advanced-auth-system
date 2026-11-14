import request from 'supertest';
import { createApp } from '../../src/app';
import { authenticator } from 'otplib';
import { Application } from 'express';

describe('Two-Factor Authentication (2FA) Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  const testUser = {
    name: 'TwoFactor User',
    email: '2fa@example.com',
    password: 'Password123!',
  };

  let userToken: string;

  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    userToken = loginRes.body.data.accessToken;
  });

  it('should generate TOTP setup secret and QR code', async () => {
    const res = await request(app)
      .post('/api/v1/2fa/setup')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.qrCode).toContain('data:image/png;base64');
  });

  it('should enable 2FA with valid TOTP code and return single-use backup recovery codes', async () => {
    // 1. Generate setup
    const setupRes = await request(app)
      .post('/api/v1/2fa/setup')
      .set('Authorization', `Bearer ${userToken}`);

    const secret = setupRes.body.data.secret;
    const currentCode = authenticator.generate(secret);

    // 2. Enable 2FA
    const enableRes = await request(app)
      .post('/api/v1/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: currentCode });

    expect(enableRes.status).toBe(200);
    expect(enableRes.body.success).toBe(true);
    expect(enableRes.body.data.backupCodes).toHaveLength(10);
  });

  it('should require 2FA on login when enabled and support both TOTP code and single-use backup codes', async () => {
    // 1. Setup & enable 2FA
    const setupRes = await request(app)
      .post('/api/v1/2fa/setup')
      .set('Authorization', `Bearer ${userToken}`);
    const secret = setupRes.body.data.secret;
    const currentCode = authenticator.generate(secret);

    const enableRes = await request(app)
      .post('/api/v1/2fa/enable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: currentCode });

    const backupCodes = enableRes.body.data.backupCodes;
    const chosenBackupCode = backupCodes[0];

    // 2. Login now triggers 2FA challenge
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.requires2FA).toBe(true);
    expect(loginRes.body.data.tempToken).toBeDefined();

    const tempToken = loginRes.body.data.tempToken;

    // 3. Complete 2FA login using the single-use backup code
    const verifyBackupRes = await request(app)
      .post('/api/v1/auth/2fa/verify')
      .send({
        tempToken,
        code: chosenBackupCode,
      });

    expect(verifyBackupRes.status).toBe(200);
    expect(verifyBackupRes.body.data.accessToken).toBeDefined();

    // 4. Try re-using the same backup code -> MUST BE REJECTED (single use!)
    const secondLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const secondTempToken = secondLoginRes.body.data.tempToken;

    const reuseAttempt = await request(app)
      .post('/api/v1/auth/2fa/verify')
      .send({
        tempToken: secondTempToken,
        code: chosenBackupCode,
      });

    expect(reuseAttempt.status).toBe(401);

    // 5. Verify using valid TOTP code works
    const newTotpCode = authenticator.generate(secret);
    const validTotpLogin = await request(app)
      .post('/api/v1/auth/2fa/verify')
      .send({
        tempToken: secondTempToken,
        code: newTotpCode,
      });

    expect(validTotpLogin.status).toBe(200);
    expect(validTotpLogin.body.data.accessToken).toBeDefined();
  });
});
