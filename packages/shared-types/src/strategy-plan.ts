export enum StrategyPlanStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum StrategyPlanType {
  CONTENT = 'CONTENT',
  PR = 'PR',
  SEO = 'SEO',
  SOCIAL = 'SOCIAL',
  INTEGRATED = 'INTEGRATED',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export interface StrategyPlan {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  goals: StrategyGoal[];
  tactics: StrategyTactic[];
  timeline: StrategyTimeline;
  budget: StrategyBudget | null;
  metrics: Record<string, unknown>;
  organizationId: string;
  ownerId: string | null;
  parentStrategyId: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface StrategyGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  priority: number;
}

export interface StrategyTactic {
  id: string;
  name: string;
  description: string;
  channel: string;
  timeline: string;
  resources: string[];
  kpis: string[];
}

export interface StrategyTimeline {
  startDate: Date;
  endDate: Date | null;
  milestones: StrategyMilestone[];
  phases: StrategyPhase[];
}

export interface StrategyMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedAt: Date | null;
}

export interface StrategyPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  objectives: string[];
}

export interface StrategyBudget {
  total: number;
  allocated: number;
  spent: number;
  currency: string;
  breakdown: BudgetItem[];
}

export interface BudgetItem {
  category: string;
  amount: number;
  spent: number;
  notes?: string;
}

export type CreateStrategyPlanInput = Pick<
  StrategyPlan,
  'name' | 'type' | 'organizationId'
> & {
  description?: string;
  ownerId?: string;
  parentStrategyId?: string;
  goals?: Omit<StrategyGoal, 'id' | 'currentValue'>[];
  tactics?: Omit<StrategyTactic, 'id'>[];
  timeline?: Partial<StrategyTimeline>;
  budget?: Omit<StrategyBudget, 'spent'>;
};

export type UpdateStrategyPlanInput = Partial<
  Pick<StrategyPlan, 'name' | 'description' | 'status' | 'goals' | 'tactics' | 'timeline' | 'budget'>
>;
