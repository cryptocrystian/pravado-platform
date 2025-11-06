export enum StrategyType {
  CONTENT = 'CONTENT',
  SEO = 'SEO',
  PR = 'PR',
  INTEGRATED = 'INTEGRATED',
}

export enum StrategyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  organizationId: string;
  ownerId: string;
  objectives: StrategyObjective[];
  tactics: StrategyTactic[];
  timeline: StrategyTimeline;
  budget: StrategyBudget | null;
  performance: StrategyPerformance;
  agentGenerated: boolean;
  agentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyObjective {
  id: string;
  description: string;
  keyResults: KeyResult[];
  priority: number;
}

export interface KeyResult {
  id: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
}

export interface StrategyTactic {
  id: string;
  name: string;
  description: string;
  channel: string;
  frequency: string;
  resources: string[];
  dependencies: string[];
}

export interface StrategyTimeline {
  startDate: Date;
  endDate: Date | null;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  completedAt: Date | null;
}

export interface StrategyBudget {
  total: number;
  allocated: number;
  spent: number;
  currency: string;
  breakdown: BudgetBreakdown[];
}

export interface BudgetBreakdown {
  category: string;
  amount: number;
  spent: number;
}

export interface StrategyPerformance {
  score: number;
  lastCalculatedAt: Date;
  metrics: Record<string, number>;
  insights: string[];
  recommendations: string[];
}

export type CreateStrategyInput = Pick<
  Strategy,
  'name' | 'description' | 'type' | 'organizationId' | 'ownerId'
> & {
  objectives?: Omit<StrategyObjective, 'id'>[];
  tactics?: Omit<StrategyTactic, 'id'>[];
  timeline?: Omit<StrategyTimeline, 'milestones'> & {
    milestones?: Omit<Milestone, 'id' | 'completed' | 'completedAt'>[];
  };
  budget?: Omit<StrategyBudget, 'spent'>;
};

export type UpdateStrategyInput = Partial<
  Pick<Strategy, 'name' | 'description' | 'status'>
>;
