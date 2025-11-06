// =====================================================
// AUTONOMOUS AGENT EVALUATOR TYPES
// Sprint 35: Agent performance evaluation framework
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export enum EvaluationSource {
  GPT = 'GPT',
  MANUAL = 'MANUAL',
  HYBRID = 'HYBRID',
}

export enum EvaluationStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum EvaluationCriteria {
  CLARITY = 'CLARITY',
  TONE = 'TONE',
  TASK_FIT = 'TASK_FIT',
  SUCCESS = 'SUCCESS',
  ACCURACY = 'ACCURACY',
  RELEVANCE = 'RELEVANCE',
  PERSONALIZATION = 'PERSONALIZATION',
  PROFESSIONALISM = 'PROFESSIONALISM',
  OUTCOME_QUALITY = 'OUTCOME_QUALITY',
  TIMING = 'TIMING',
  FOLLOW_UP = 'FOLLOW_UP',
  STRATEGIC_ALIGNMENT = 'STRATEGIC_ALIGNMENT',
}

export enum EvaluationEventType {
  EVALUATION_INITIATED = 'EVALUATION_INITIATED',
  GPT_ANALYSIS = 'GPT_ANALYSIS',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
  SCORE_ADJUSTED = 'SCORE_ADJUSTED',
  NOTE_ADDED = 'NOTE_ADDED',
  TEMPLATE_CHANGED = 'TEMPLATE_CHANGED',
  COACHING_GENERATED = 'COACHING_GENERATED',
}

// =====================================================
// MAIN INTERFACES
// =====================================================

export interface AgentEvaluation {
  id: string;
  organization_id: string;

  // Linkage
  agent_run_id?: string;
  campaign_id?: string;
  contact_id?: string;

  // Evaluation metadata
  source: EvaluationSource;
  status: EvaluationStatus;
  template_id?: string;

  // Scores
  overall_score?: number;
  score_breakdown: Record<string, number>;
  criteria_weights: Record<string, number>;

  // Analysis
  strengths?: string[];
  weaknesses?: string[];
  improvement_suggestions?: string[];
  coaching_prompts?: string[];

  // Context
  evaluation_context: Record<string, any>;
  metadata: Record<string, any>;

  // Tracking
  evaluated_by?: string;
  evaluated_at?: string;

  created_at: string;
  updated_at: string;
}

export interface EvaluationEvent {
  id: string;
  evaluation_id: string;

  // Event details
  event_type: string;
  description: string;

  // Event data
  old_value?: any;
  new_value?: any;

  // Metadata
  triggered_by?: string;
  metadata: Record<string, any>;

  created_at: string;
}

export interface EvaluationTemplate {
  id: string;
  organization_id: string;

  // Template details
  name: string;
  description?: string;

  // Criteria configuration
  criteria: EvaluationCriteria[];
  criteria_weights: Record<string, number>;

  // Scoring config
  scoring_guidance: Record<string, string>;
  pass_threshold: number;

  // Template metadata
  is_default: boolean;
  is_active: boolean;

  // Context applicability
  applicable_to?: string[];

  created_by?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface EvaluationSourceConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface EvaluationStatusConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface EvaluationCriteriaConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  defaultWeight: number;
  scoringGuidance: string;
}

export interface EvaluationEventTypeConfig {
  label: string;
  color: string;
  icon: string;
}

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

export const EVALUATION_SOURCE_CONFIGS: Record<EvaluationSource, EvaluationSourceConfig> = {
  [EvaluationSource.GPT]: {
    label: 'GPT-4 Automated',
    description: 'Fully automated evaluation by GPT-4',
    color: 'purple',
    icon: 'Sparkles',
  },
  [EvaluationSource.MANUAL]: {
    label: 'Manual',
    description: 'Human-reviewed and scored',
    color: 'blue',
    icon: 'User',
  },
  [EvaluationSource.HYBRID]: {
    label: 'Hybrid',
    description: 'GPT-4 assisted with human review',
    color: 'green',
    icon: 'Users',
  },
};

export const EVALUATION_STATUS_CONFIGS: Record<EvaluationStatus, EvaluationStatusConfig> = {
  [EvaluationStatus.PENDING]: {
    label: 'Pending',
    description: 'Evaluation in progress',
    color: 'yellow',
    icon: 'Clock',
  },
  [EvaluationStatus.COMPLETED]: {
    label: 'Completed',
    description: 'Evaluation completed successfully',
    color: 'green',
    icon: 'CheckCircle',
  },
  [EvaluationStatus.FAILED]: {
    label: 'Failed',
    description: 'Evaluation encountered an error',
    color: 'red',
    icon: 'XCircle',
  },
};

export const EVALUATION_CRITERIA_CONFIGS: Record<EvaluationCriteria, EvaluationCriteriaConfig> = {
  [EvaluationCriteria.CLARITY]: {
    label: 'Clarity',
    description: 'Message clarity and comprehension',
    color: 'blue',
    icon: 'Eye',
    defaultWeight: 1.0,
    scoringGuidance: 'How clear and understandable is the communication?',
  },
  [EvaluationCriteria.TONE]: {
    label: 'Tone',
    description: 'Appropriate tone and voice',
    color: 'purple',
    icon: 'MessageSquare',
    defaultWeight: 1.2,
    scoringGuidance: 'Is the tone appropriate for the context and audience?',
  },
  [EvaluationCriteria.TASK_FIT]: {
    label: 'Task Fit',
    description: 'Alignment with assigned task',
    color: 'green',
    icon: 'Target',
    defaultWeight: 1.5,
    scoringGuidance: 'How well does the output match the intended task?',
  },
  [EvaluationCriteria.SUCCESS]: {
    label: 'Success',
    description: 'Achievement of desired outcome',
    color: 'green',
    icon: 'CheckCircle2',
    defaultWeight: 2.0,
    scoringGuidance: 'Did the agent achieve the desired outcome?',
  },
  [EvaluationCriteria.ACCURACY]: {
    label: 'Accuracy',
    description: 'Factual correctness and precision',
    color: 'indigo',
    icon: 'CheckSquare',
    defaultWeight: 1.5,
    scoringGuidance: 'Are the facts and information accurate?',
  },
  [EvaluationCriteria.RELEVANCE]: {
    label: 'Relevance',
    description: 'Contextual appropriateness',
    color: 'teal',
    icon: 'Filter',
    defaultWeight: 1.3,
    scoringGuidance: 'Is the content relevant to the situation?',
  },
  [EvaluationCriteria.PERSONALIZATION]: {
    label: 'Personalization',
    description: 'Tailored to recipient',
    color: 'pink',
    icon: 'UserCheck',
    defaultWeight: 1.4,
    scoringGuidance: 'How well is the message personalized to the recipient?',
  },
  [EvaluationCriteria.PROFESSIONALISM]: {
    label: 'Professionalism',
    description: 'Professional standards and etiquette',
    color: 'gray',
    icon: 'Briefcase',
    defaultWeight: 1.2,
    scoringGuidance: 'Does it meet professional communication standards?',
  },
  [EvaluationCriteria.OUTCOME_QUALITY]: {
    label: 'Outcome Quality',
    description: 'Quality of achieved results',
    color: 'yellow',
    icon: 'Award',
    defaultWeight: 1.8,
    scoringGuidance: 'How good is the quality of the outcome?',
  },
  [EvaluationCriteria.TIMING]: {
    label: 'Timing',
    description: 'Appropriate timing of action',
    color: 'orange',
    icon: 'Clock',
    defaultWeight: 1.1,
    scoringGuidance: 'Was the timing appropriate and timely?',
  },
  [EvaluationCriteria.FOLLOW_UP]: {
    label: 'Follow-Up',
    description: 'Quality of follow-up actions',
    color: 'cyan',
    icon: 'RepeatCircle',
    defaultWeight: 1.2,
    scoringGuidance: 'Are follow-up actions appropriate and effective?',
  },
  [EvaluationCriteria.STRATEGIC_ALIGNMENT]: {
    label: 'Strategic Alignment',
    description: 'Alignment with campaign strategy',
    color: 'violet',
    icon: 'Compass',
    defaultWeight: 1.6,
    scoringGuidance: 'How well does this align with overall strategy?',
  },
};

export const EVALUATION_EVENT_TYPE_CONFIGS: Record<string, EvaluationEventTypeConfig> = {
  EVALUATION_INITIATED: {
    label: 'Evaluation Initiated',
    color: 'blue',
    icon: 'Play',
  },
  GPT_ANALYSIS: {
    label: 'GPT Analysis',
    color: 'purple',
    icon: 'Sparkles',
  },
  MANUAL_OVERRIDE: {
    label: 'Manual Override',
    color: 'orange',
    icon: 'Edit',
  },
  SCORE_ADJUSTED: {
    label: 'Score Adjusted',
    color: 'yellow',
    icon: 'TrendingUp',
  },
  NOTE_ADDED: {
    label: 'Note Added',
    color: 'gray',
    icon: 'FileText',
  },
  TEMPLATE_CHANGED: {
    label: 'Template Changed',
    color: 'green',
    icon: 'Settings',
  },
  COACHING_GENERATED: {
    label: 'Coaching Generated',
    color: 'indigo',
    icon: 'MessageCircle',
  },
};

// =====================================================
// INPUT TYPES
// =====================================================

export interface EvaluateRunInput {
  organizationId: string;
  agentRunId: string;
  campaignId?: string;
  contactId?: string;
  templateId?: string;
  source?: EvaluationSource;
  evaluatedBy?: string;
  evaluationContext?: Record<string, any>;
}

export interface SummarizeEvaluationInput {
  organizationId: string;
  evaluationId: string;
}

export interface UpdateEvaluationInput {
  evaluationId: string;
  scoreBreakdown?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  improvementSuggestions?: string[];
  coachingPrompts?: string[];
  metadata?: Record<string, any>;
}

export interface LogEvaluationEventInput {
  evaluationId: string;
  eventType: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export interface CreateEvaluationTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  criteria: EvaluationCriteria[];
  criteriaWeights: Record<string, number>;
  scoringGuidance?: Record<string, string>;
  passThreshold?: number;
  isDefault?: boolean;
  applicableTo?: string[];
  createdBy?: string;
}

export interface UpdateEvaluationTemplateInput {
  templateId: string;
  name?: string;
  description?: string;
  criteria?: EvaluationCriteria[];
  criteriaWeights?: Record<string, number>;
  scoringGuidance?: Record<string, string>;
  passThreshold?: number;
  isDefault?: boolean;
  isActive?: boolean;
  applicableTo?: string[];
}

export interface GetEvaluationsInput {
  organizationId: string;
  agentRunId?: string;
  campaignId?: string;
  contactId?: string;
  source?: EvaluationSource;
  status?: EvaluationStatus;
  templateId?: string;
  minScore?: number;
  maxScore?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface GetEvaluationEventsInput {
  evaluationId: string;
  eventType?: string;
  limit?: number;
  offset?: number;
}

export interface GetEvaluationDashboardInput {
  organizationId: string;
  campaignId?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface RecommendImprovementsInput {
  organizationId: string;
  evaluationId: string;
}

export interface GetTemplatesInput {
  organizationId: string;
  isActive?: boolean;
  isDefault?: boolean;
  applicableTo?: string;
}

// =====================================================
// OUTPUT TYPES
// =====================================================

export interface EvaluationWithDetails extends AgentEvaluation {
  template?: EvaluationTemplate;
  recent_events?: EvaluationEvent[];
  score_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  is_passing: boolean;
  criteria_scores: Array<{
    criteria: EvaluationCriteria;
    score: number;
    weight: number;
    weighted_score: number;
  }>;
}

export interface EvaluationSummary {
  evaluation_id: string;
  total_evaluations: number;
  avg_overall_score: number;
  gpt_evaluations: number;
  manual_evaluations: number;
  hybrid_evaluations: number;
  completed_evaluations: number;
  pending_evaluations: number;
  avg_scores_by_criteria: Record<string, number>;
}

export interface EvaluationDashboard {
  total_evaluations: number;
  avg_overall_score: number;
  score_trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  top_performers: Array<{
    evaluation_id: string;
    agent_run_id?: string;
    overall_score: number;
    strengths?: string[];
  }>;
  bottom_performers: Array<{
    evaluation_id: string;
    agent_run_id?: string;
    overall_score: number;
    weaknesses?: string[];
    improvement_suggestions?: string[];
  }>;
  criteria_breakdown: Record<string, number>;
  recent_evaluations: Array<{
    evaluation_id: string;
    agent_run_id?: string;
    overall_score: number;
    source: EvaluationSource;
    created_at: string;
  }>;
  evaluation_velocity: Record<string, number>;
}

export interface ScoreBreakdown {
  criteria: EvaluationCriteria;
  score: number;
  weight: number;
  weighted_score: number;
  max_score: number;
  percentage: number;
}

// =====================================================
// GPT-POWERED INSIGHTS
// =====================================================

export interface GptEvaluationAnalysis {
  evaluation_id: string;

  // Scoring
  score_breakdown: Record<string, number>;
  overall_score: number;

  // Analysis
  strengths: string[];
  weaknesses: string[];

  // Detailed feedback
  detailed_feedback: {
    criteria: EvaluationCriteria;
    score: number;
    reasoning: string;
    examples?: string[];
  }[];

  // Recommendations
  improvement_suggestions: string[];
  coaching_prompts: string[];

  // Meta
  confidence: number;
  analysis_summary: string;
  generated_at: string;
}

export interface ImprovementRecommendations {
  evaluation_id: string;
  agent_run_id?: string;

  // Prioritized recommendations
  immediate_actions: Array<{
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    category: string;
    recommendation: string;
    expected_impact: string;
  }>;

  // Long-term improvements
  skill_development: Array<{
    skill_area: string;
    current_level: string;
    target_level: string;
    development_path: string[];
  }>;

  // Coaching suggestions
  coaching_focus_areas: string[];
  suggested_training: string[];

  // Pattern analysis
  recurring_issues?: string[];
  emerging_strengths?: string[];

  generated_at: string;
}

export interface AgentPerformanceReport {
  agent_run_id: string;
  campaign_id?: string;

  // Overall metrics
  total_evaluations: number;
  avg_overall_score: number;
  score_trend: 'IMPROVING' | 'STABLE' | 'DECLINING';

  // Criteria performance
  criteria_performance: Array<{
    criteria: EvaluationCriteria;
    avg_score: number;
    trend: 'UP' | 'STABLE' | 'DOWN';
  }>;

  // Strengths & weaknesses
  top_strengths: string[];
  areas_for_improvement: string[];

  // Recommendations
  key_recommendations: string[];

  period_start: string;
  period_end: string;
  generated_at: string;
}

// =====================================================
// CHART DATA TYPES
// =====================================================

export interface ScoreTrendChartData {
  date: string;
  overall_score: number;
  gpt_score?: number;
  manual_score?: number;
}

export interface CriteriaComparisonChartData {
  criteria: EvaluationCriteria;
  score: number;
  benchmark: number;
  weight: number;
}

export interface SourceDistributionChartData {
  source: EvaluationSource;
  count: number;
  avg_score: number;
  percentage: number;
}

export interface PerformanceDistributionChartData {
  score_range: string;
  count: number;
  percentage: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface EvaluationFilters {
  source?: EvaluationSource[];
  status?: EvaluationStatus[];
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  campaignId?: string;
  templateId?: string;
}

export interface EvaluationSortOptions {
  field: 'overall_score' | 'created_at' | 'evaluated_at';
  direction: 'asc' | 'desc';
}

export interface BulkEvaluationRequest {
  organizationId: string;
  agentRunIds: string[];
  templateId?: string;
  source?: EvaluationSource;
}
