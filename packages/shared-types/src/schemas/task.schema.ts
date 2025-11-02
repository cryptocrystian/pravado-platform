import { z } from 'zod';
import { TaskStatus, TaskPriority } from '../task';

export const TaskStatusSchema = z.nativeEnum(TaskStatus);
export const TaskPrioritySchema = z.nativeEnum(TaskPriority);

export const ChecklistItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  completed: z.boolean().default(false),
  completedAt: z.date().nullable(),
});

export const TaskAttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number().positive(),
  uploadedAt: z.date(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  assigneeId: z.string().uuid().nullable(),
  campaignId: z.string().uuid().nullable(),
  contentId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  tags: z.array(z.string()).default([]),
  checklist: z.array(ChecklistItemSchema).default([]),
  attachments: z.array(TaskAttachmentSchema).default([]),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1).max(500),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.default(TaskPriority.NORMAL),
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  checklist: z.array(
    z.object({
      text: z.string().min(1),
      completed: z.boolean().default(false),
    })
  ).optional(),
});

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  completedAt: z.date().optional(),
});
