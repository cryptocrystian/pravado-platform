export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  assigneeId: string | null;
  campaignId: string | null;
  contentId: string | null;
  parentTaskId: string | null;
  tags: string[];
  checklist: ChecklistItem[];
  attachments: TaskAttachment[];
  organizationId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt: Date | null;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export type CreateTaskInput = Pick<Task, 'title' | 'organizationId'> & {
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  assigneeId?: string;
  campaignId?: string;
  contentId?: string;
  parentTaskId?: string;
  tags?: string[];
  checklist?: Omit<ChecklistItem, 'id' | 'completedAt'>[];
};

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'dueDate'
    | 'assigneeId'
    | 'tags'
    | 'checklist'
    | 'completedAt'
  >
>;
