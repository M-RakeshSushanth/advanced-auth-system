import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

describe('Sessions Module Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  const testUser = {
    name: 'Session User',
    email: 'sessions@example.com',
    password: 'Password123!',
  };

  it('should list active sessions, mark current session, and revoke other sessions', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    // Login from Device 1
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-Chrome-Desktop')
      .send({ email: testUser.email, password: testUser.password });

    const token1 = login1.body.data.accessToken;

    // Login from Device 2
    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Device-Safari-iPhone')
      .send({ email: testUser.email, password: testUser.password });

    const token2 = login2.body.data.accessToken;

    // Get active sessions from Device 2
    const sessionsRes = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${token2}`);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.length).toBeGreaterThanOrEqual(2);

    const currentSession = sessionsRes.body.data.find((s: any) => s.isCurrent);
    expect(currentSession).toBeDefined();

    // Revoke all other sessions from Device 2
    const revokeOthersRes = await request(app)
      .delete('/api/v1/sessions/others')
      .set('Authorization', `Bearer ${token2}`);

    expect(revokeOthersRes.status).toBe(200);

    // Verify Device 1 token is now rejected because its session was revoked
    const checkDevice1 = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(checkDevice1.status).toBe(401);

    // Device 2 is still valid
    const checkDevice2 = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token2}`);

    expect(checkDevice2.status).toBe(200);
  });
});
