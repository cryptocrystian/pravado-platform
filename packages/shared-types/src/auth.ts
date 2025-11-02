import { UserRole } from './user';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Campaign permissions
  CAMPAIGN_READ = 'campaign:read',
  CAMPAIGN_WRITE = 'campaign:write',
  CAMPAIGN_DELETE = 'campaign:delete',

  // Content permissions
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_PUBLISH = 'content:publish',
  CONTENT_DELETE = 'content:delete',

  // Agent permissions
  AGENT_EXECUTE = 'agent:execute',
  AGENT_MANAGE = 'agent:manage',

  // Organization permissions
  ORG_MANAGE = 'org:manage',
  ORG_BILLING = 'org:billing',
}

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.CAMPAIGN_READ,
    Permission.CAMPAIGN_WRITE,
    Permission.CAMPAIGN_DELETE,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_DELETE,
    Permission.AGENT_EXECUTE,
    Permission.AGENT_MANAGE,
  ],
  [UserRole.CONTRIBUTOR]: [
    Permission.USER_READ,
    Permission.CAMPAIGN_READ,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.AGENT_EXECUTE,
  ],
  [UserRole.VIEWER]: [
    Permission.USER_READ,
    Permission.CAMPAIGN_READ,
    Permission.CONTENT_READ,
  ],
};
