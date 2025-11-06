// =====================================================
// UNIFIED GOAL TRACKING & OKR INTELLIGENCE TYPES
// Sprint 34: Multi-level goals, OKR snapshots, AI insights
// =====================================================

import { GoalStatus, GoalType as BaseGoalType, GoalTypeConfig as BaseGoalTypeConfig, GoalStatusConfig as BaseGoalStatusConfig, GOAL_TYPE_CONFIGS as BASE_GOAL_TYPE_CONFIGS, GOAL_STATUS_CONFIGS as BASE_GOAL_STATUS_CONFIGS } from './goals';

// =====================================================
// ENUMS
// =====================================================

export enum GoalScope {
  ORG = 'ORG',
  TEAM = 'TEAM',
  USER = 'USER',
  CAMPAIGN = 'CAMPAIGN',
}

export enum TrackingGoalType {
  OUTREACH = 'OUTREACH',
  CONVERSION = 'CONVERSION',
  PLACEMENT = 'PLACEMENT',
  LEAD_SCORE = 'LEAD_SCORE',
  SENTIMENT = 'SENTIMENT',
  RESPONSE_RATE = 'RESPONSE_RATE',
  CUSTOM = 'CUSTOM',
}

export enum GoalEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  PROGRESS_LOGGED = 'PROGRESS_LOGGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TARGET_ADJUSTED = 'TARGET_ADJUSTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// =====================================================
// MAIN INTERFACES
// =====================================================

export interface Goal {
  id: string;
  organization_id: string;
  scope: GoalScope;
  scope_id: string;
  parent_goal_id?: string;
  goal_type: TrackingGoalType;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: GoalStatus;
  start_date: string;
  end_date: string;
  owner_id?: string;
  alignment_score?: number;
  risk_level?: RiskLevel;
  progress_velocity?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  recorded_at: string;
  value: number;
  delta: number;
  notes?: string;
  logged_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface OkrSnapshot {
  id: string;
  organization_id: string;
  scope: GoalScope;
  scope_id: string;
  snapshot_date: string;
  objectives_total: number;
  objectives_on_track: number;
  objectives_at_risk: number;
  objectives_completed: number;
  avg_completion_rate: number;
  avg_velocity: number;
  top_risks?: Array<{
    goal_id: string;
    title: string;
    risk_level: RiskLevel;
    reason: string;
  }>;
  strategic_gaps?: string[];
  recommended_actions?: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    action: string;
  }>;
  created_at: string;
}

export interface GoalEvent {
  id: string;
  goal_id: string;
  event_type: GoalEventType;
  description: string;
  old_value?: any;
  new_value?: any;
  triggered_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface GoalScopeConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface TrackingGoalTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  defaultUnit: string;
}

export interface RiskLevelConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  threshold: number;
}

export interface GoalEventTypeConfig {
  label: string;
  color: string;
  icon: string;
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

export const GOAL_SCOPE_CONFIGS: Record<GoalScope, GoalScopeConfig> = {
  [GoalScope.ORG]: {
    label: 'Organization',
    description: 'Company-wide objectives and strategic goals',
    color: 'purple',
    icon: 'Building2',
  },
  [GoalScope.TEAM]: {
    label: 'Team',
    description: 'Team-level goals and collaborative objectives',
    color: 'blue',
    icon: 'Users',
  },
  [GoalScope.USER]: {
    label: 'Individual',
    description: 'Personal goals and individual KPIs',
    color: 'green',
    icon: 'User',
  },
  [GoalScope.CAMPAIGN]: {
    label: 'Campaign',
    description: 'Campaign-specific targets and metrics',
    color: 'orange',
    icon: 'Target',
  },
};

export const TRACKING_GOAL_TYPE_CONFIGS: Record<TrackingGoalType, TrackingGoalTypeConfig> = {
  [TrackingGoalType.OUTREACH]: {
    label: 'Outreach Volume',
    description: 'Number of contacts reached or messages sent',
    color: 'blue',
    icon: 'Send',
    defaultUnit: 'contacts',
  },
  [TrackingGoalType.CONVERSION]: {
    label: 'Conversion Rate',
    description: 'Percentage of conversions or successful outcomes',
    color: 'green',
    icon: 'TrendingUp',
    defaultUnit: '%',
  },
  [TrackingGoalType.PLACEMENT]: {
    label: 'Media Placements',
    description: 'Number of media mentions or coverage pieces',
    color: 'purple',
    icon: 'Newspaper',
    defaultUnit: 'placements',
  },
  [TrackingGoalType.LEAD_SCORE]: {
    label: 'Lead Quality Score',
    description: 'Average lead score or quality rating',
    color: 'yellow',
    icon: 'Star',
    defaultUnit: 'points',
  },
  [TrackingGoalType.SENTIMENT]: {
    label: 'Sentiment Score',
    description: 'Brand or response sentiment rating',
    color: 'pink',
    icon: 'Heart',
    defaultUnit: 'score',
  },
  [TrackingGoalType.RESPONSE_RATE]: {
    label: 'Response Rate',
    description: 'Percentage of responses received',
    color: 'indigo',
    icon: 'MessageSquare',
    defaultUnit: '%',
  },
  [TrackingGoalType.CUSTOM]: {
    label: 'Custom Metric',
    description: 'User-defined metric or KPI',
    color: 'gray',
    icon: 'Settings',
    defaultUnit: 'units',
  },
};

export const RISK_LEVEL_CONFIGS: Record<RiskLevel, RiskLevelConfig> = {
  [RiskLevel.LOW]: {
    label: 'Low Risk',
    description: 'Goal is on track with healthy progress',
    color: 'green',
    icon: 'CheckCircle',
    threshold: 0.75,
  },
  [RiskLevel.MEDIUM]: {
    label: 'Medium Risk',
    description: 'Goal needs attention but is achievable',
    color: 'yellow',
    icon: 'AlertCircle',
    threshold: 0.5,
  },
  [RiskLevel.HIGH]: {
    label: 'High Risk',
    description: 'Goal is significantly behind and needs urgent action',
    color: 'orange',
    icon: 'AlertTriangle',
    threshold: 0.25,
  },
  [RiskLevel.CRITICAL]: {
    label: 'Critical Risk',
    description: 'Goal is unlikely to be achieved without major intervention',
    color: 'red',
    icon: 'XOctagon',
    threshold: 0,
  },
};

export const GOAL_EVENT_TYPE_CONFIGS: Record<GoalEventType, GoalEventTypeConfig> = {
  [GoalEventType.CREATED]: {
    label: 'Goal Created',
    color: 'blue',
    icon: 'Plus',
  },
  [GoalEventType.UPDATED]: {
    label: 'Goal Updated',
    color: 'gray',
    icon: 'Edit',
  },
  [GoalEventType.PROGRESS_LOGGED]: {
    label: 'Progress Logged',
    color: 'green',
    icon: 'TrendingUp',
  },
  [GoalEventType.STATUS_CHANGED]: {
    label: 'Status Changed',
    color: 'purple',
    icon: 'RefreshCw',
  },
  [GoalEventType.TARGET_ADJUSTED]: {
    label: 'Target Adjusted',
    color: 'yellow',
    icon: 'Target',
  },
  [GoalEventType.COMPLETED]: {
    label: 'Goal Completed',
    color: 'green',
    icon: 'CheckCircle2',
  },
  [GoalEventType.FAILED]: {
    label: 'Goal Failed',
    color: 'red',
    icon: 'XCircle',
  },
};

// =====================================================
// INPUT TYPES
// =====================================================

export interface CreateGoalInput {
  organizationId: string;
  scope: GoalScope;
  scopeId: string;
  parentGoalId?: string;
  goalType: TrackingGoalType;
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateGoalInput {
  goalId: string;
  title?: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  endDate?: string;
  ownerId?: string;
  metadata?: Record<string, any>;
}

export interface LogGoalEventInput {
  goalId: string;
  eventType: GoalEventType;
  description: string;
  oldValue?: any;
  newValue?: any;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export interface UpdateGoalProgressInput {
  goalId: string;
  value: number;
  notes?: string;
  loggedBy?: string;
  metadata?: Record<string, any>;
}

export interface CalculateGoalMetricsInput {
  organizationId: string;
  goalId: string;
}

export interface GenerateOkrSnapshotInput {
  organizationId: string;
  scope: GoalScope;
  scopeId: string;
}

export interface SummarizeGoalInput {
  organizationId: string;
  goalId: string;
}

export interface ValidateAlignmentInput {
  organizationId: string;
  goalId: string;
  parentGoalId?: string;
}

export interface RecommendStretchGoalsInput {
  organizationId: string;
  scope: GoalScope;
  scopeId: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface GetGoalsInput {
  organizationId: string;
  scope?: GoalScope;
  scopeId?: string;
  goalType?: TrackingGoalType;
  status?: GoalStatus;
  ownerId?: string;
  parentGoalId?: string;
  limit?: number;
  offset?: number;
}

export interface GetGoalTimelineInput {
  organizationId: string;
  goalId: string;
  limit?: number;
  offset?: number;
}

export interface GetGoalDashboardInput {
  organizationId: string;
  scope?: GoalScope;
  scopeId?: string;
  periodStart?: string;
  periodEnd?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface GoalWithProgress extends Goal {
  progress_history?: GoalProgress[];
  child_goals?: Goal[];
  parent_goal?: Goal;
  recent_events?: GoalEvent[];
  completion_percentage: number;
  days_remaining: number;
  is_overdue: boolean;
}

export interface GoalMetrics {
  goal_id: string;
  completion_rate: number;
  velocity: number;
  estimated_completion_date: string;
  risk_level: RiskLevel;
  days_behind_schedule: number;
  required_daily_progress: number;
}

export interface GoalTimeline {
  goal: GoalWithProgress;
  events: GoalEvent[];
  progress_history: GoalProgress[];
  total_events: number;
}

export interface GoalDashboard {
  summary: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    at_risk_goals: number;
    avg_completion_rate: number;
  };
  by_type: Array<{
    goal_type: TrackingGoalType;
    count: number;
    avg_completion: number;
  }>;
  by_status: Array<{
    status: GoalStatus;
    count: number;
  }>;
  top_performers: Array<{
    goal: GoalWithProgress;
    completion_rate: number;
  }>;
  at_risk_goals: Array<{
    goal: GoalWithProgress;
    risk_level: RiskLevel;
    reason: string;
  }>;
  recent_completions: GoalWithProgress[];
  okr_snapshot?: OkrSnapshot;
}

// =====================================================
// AI-POWERED INSIGHTS
// =====================================================

export interface GptGoalSummary {
  goal_id: string;
  summary: string;
  key_achievements: string[];
  challenges: string[];
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    recommendation: string;
  }>;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  confidence: number;
  generated_at: string;
}

export interface AlignmentValidation {
  goal_id: string;
  parent_goal_id?: string;
  alignment_score: number;
  is_aligned: boolean;
  alignment_analysis: string;
  gaps: string[];
  suggestions: string[];
  confidence: number;
  validated_at: string;
}

export interface StretchGoalRecommendation {
  recommended_goal: {
    title: string;
    description: string;
    goal_type: TrackingGoalType;
    target_value: number;
    unit: string;
  };
  rationale: string;
  potential_impact: string;
  confidence: number;
  based_on_goals: string[];
}

export interface StretchGoalRecommendations {
  scope: GoalScope;
  scope_id: string;
  recommendations: StretchGoalRecommendation[];
  overall_analysis: string;
  generated_at: string;
}

// =====================================================
// CHART DATA TYPES
// =====================================================

export interface GoalProgressChartData {
  date: string;
  actual: number;
  target: number;
  projected?: number;
}

export interface GoalVelocityChartData {
  period: string;
  velocity: number;
  avg_velocity: number;
}

export interface GoalCompletionChartData {
  goal_type: TrackingGoalType;
  completed: number;
  active: number;
  at_risk: number;
}

export interface RiskDistributionChartData {
  risk_level: RiskLevel;
  count: number;
  percentage: number;
}
