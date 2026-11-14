import request from 'supertest';
import { createApp } from '../../src/app';
import { User } from '../../src/modules/users/user.model';
import { UserRole } from '../../src/common/constants/roles.constant';
import { Application } from 'express';

describe('RBAC & Authorization Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  const createAuthenticatedUser = async (
    email: string,
    role: UserRole = UserRole.USER
  ): Promise<{ token: string; user: any }> => {
    await request(app).post('/api/v1/auth/register').send({
      name: `User ${role}`,
      email,
      password: 'Password123!',
    });

    // Update role in DB
    await User.findOneAndUpdate({ email }, { role, isEmailVerified: true });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Password123!',
    });

    return {
      token: loginRes.body.data.accessToken,
      user: loginRes.body.data.user,
    };
  };

  it('Normal USER should NOT be allowed to access admin routes', async () => {
    const { token } = await createAuthenticatedUser('user@example.com', UserRole.USER);

    const res = await request(app)
      .get('/api/v1/authorization/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('ADMIN should be allowed to access admin routes and list users', async () => {
    const { token } = await createAuthenticatedUser('admin@example.com', UserRole.ADMIN);

    const res = await request(app)
      .get('/api/v1/authorization/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toBeDefined();
  });

  it('ADMIN should NOT be allowed to alter user roles (Super Admin only)', async () => {
    const { token: adminToken } = await createAuthenticatedUser('admin2@example.com', UserRole.ADMIN);
    const { user: normalUser } = await createAuthenticatedUser('target@example.com', UserRole.USER);

    const res = await request(app)
      .patch(`/api/v1/users/${normalUser._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: UserRole.ADMIN });

    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN should be allowed to update user roles', async () => {
    const { token: superAdminToken } = await createAuthenticatedUser(
      'superadmin@example.com',
      UserRole.SUPER_ADMIN
    );
    const { user: normalUser } = await createAuthenticatedUser('target2@example.com', UserRole.USER);

    const res = await request(app)
      .patch(`/api/v1/users/${normalUser._id}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: UserRole.ADMIN });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe(UserRole.ADMIN);
  });

  it('SUPER_ADMIN should be able to access super-admin-only resource', async () => {
    const { token: superAdminToken } = await createAuthenticatedUser(
      'superadmin2@example.com',
      UserRole.SUPER_ADMIN
    );

    const res = await request(app)
      .get('/api/v1/authorization/super-admin-only')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Deactivating a user account should immediately revoke access', async () => {
    const { token: adminToken } = await createAuthenticatedUser('admin3@example.com', UserRole.ADMIN);
    const { token: userToken, user: targetUser } = await createAuthenticatedUser(
      'tobedeactivated@example.com',
      UserRole.USER
    );

    // Deactivate user
    const deactivateRes = await request(app)
      .patch(`/api/v1/users/${targetUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(deactivateRes.status).toBe(200);

    // Now the user's token should be rejected
    const profileRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(profileRes.status).toBe(401);
  });
});
