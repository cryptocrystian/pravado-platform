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
  tactics: PlanTactic[];
  timeline: PlanTimeline;
  budget: PlanBudget | null;
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

export interface PlanTactic {
  id: string;
  name: string;
  description: string;
  channel: string;
  timeline: string;
  resources: string[];
  kpis: string[];
}

export interface PlanTimeline {
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

export interface PlanBudget {
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
  tactics?: Omit<PlanTactic, 'id'>[];
  timeline?: Partial<PlanTimeline>;
  budget?: Omit<PlanBudget, 'spent'>;
};

export type UpdateStrategyPlanInput = Partial<
  Pick<StrategyPlan, 'name' | 'description' | 'status' | 'goals' | 'tactics' | 'timeline' | 'budget'>
>;
