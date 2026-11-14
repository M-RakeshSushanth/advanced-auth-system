export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Permission {
  // User permissions
  USER_READ_SELF = 'user:read_self',
  USER_UPDATE_SELF = 'user:update_self',
  USER_DELETE_SELF = 'user:delete_self',

  // Admin user management permissions
  USERS_READ_ALL = 'users:read_all',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_DEACTIVATE = 'users:deactivate',

  // Super Admin role & security permissions
  ROLES_MANAGE = 'roles:manage',
  SECURITY_AUDIT = 'security:audit',

  // Session permissions
  SESSIONS_READ_SELF = 'sessions:read_self',
  SESSIONS_REVOKE_SELF = 'sessions:revoke_self',
  SESSIONS_MANAGE_ALL = 'sessions:manage_all',
}

// Map roles to their permission sets
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.SESSIONS_READ_SELF,
    Permission.SESSIONS_REVOKE_SELF,
  ],
  [UserRole.ADMIN]: [
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.SESSIONS_READ_SELF,
    Permission.SESSIONS_REVOKE_SELF,
    Permission.USERS_READ_ALL,
    Permission.USERS_UPDATE,
    Permission.USERS_DEACTIVATE,
    Permission.SESSIONS_MANAGE_ALL,
  ],
  [UserRole.SUPER_ADMIN]: [
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.USER_DELETE_SELF,
    Permission.SESSIONS_READ_SELF,
    Permission.SESSIONS_REVOKE_SELF,
    Permission.USERS_READ_ALL,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.USERS_DEACTIVATE,
    Permission.SESSIONS_MANAGE_ALL,
    Permission.ROLES_MANAGE,
    Permission.SECURITY_AUDIT,
  ],
};
