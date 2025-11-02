import { z } from 'zod';
import { UserRole, UserStatus } from '../user';

export const UserRoleSchema = z.nativeEnum(UserRole);
export const UserStatusSchema = z.nativeEnum(UserStatus);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  avatarUrl: z.string().url().nullable(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  slackNotifications: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
});

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: UserRoleSchema,
  organizationId: z.string().uuid(),
});

export const UpdateUserInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  avatarUrl: z.string().url().optional(),
});
