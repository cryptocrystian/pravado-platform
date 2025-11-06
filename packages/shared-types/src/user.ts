export enum UserRole {
  // System & Admin Roles
  ADMIN = 'admin',
  DEVELOPER = 'developer',

  // Core Team Roles
  AGENT = 'agent',
  CAMPAIGN_MANAGER = 'campaign_manager',
  CONTENT_CREATOR = 'content_creator',
  EDITOR = 'editor',
  STRATEGIST = 'strategist',
  ANALYST = 'analyst',
  ACCOUNT_MANAGER = 'account_manager',

  // Client & External Roles
  CLIENT = 'client',
  EXECUTIVE = 'executive',
  TEAM_MEMBER = 'team_member',

  // Media & PR Roles
  MEDIA_CONTACT = 'media_contact',

  // Limited Access Roles
  GUEST = 'guest',
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
