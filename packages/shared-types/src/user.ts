export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  phone: string | null;
  timezone: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  emailNotifications: boolean;
  slackNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export type CreateUserInput = Pick<User, 'email' | 'name' | 'role' | 'organizationId'>;

export type UpdateUserInput = Partial<Pick<User, 'name' | 'role' | 'status' | 'avatarUrl'>>;
