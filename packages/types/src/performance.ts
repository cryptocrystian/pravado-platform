// =====================================================
// PERFORMANCE INSIGHTS & OPTIMIZATION TYPES
// =====================================================

/**
 * Insight type enumeration
 */
export enum InsightType {
  AGENT = 'AGENT',
  CAMPAIGN = 'CAMPAIGN',
  TASK = 'TASK',
  GOAL = 'GOAL',
  PITCH = 'PITCH',
}

/**
 * Metric type enumeration
 */
export enum MetricType {
  SUCCESS = 'SUCCESS',
  QUALITY = 'QUALITY',
  EFFICIENCY = 'EFFICIENCY',
  RESPONSE_RATE = 'RESPONSE_RATE',
  CONVERSION = 'CONVERSION',
  SPEED = 'SPEED',
  ACCURACY = 'ACCURACY',
  ENGAGEMENT = 'ENGAGEMENT',
}

/**
 * Experiment status enumeration
 */
export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Variant type enumeration
 */
export enum VariantType {
  CONTROL = 'CONTROL',
  VARIANT_A = 'VARIANT_A',
  VARIANT_B = 'VARIANT_B',
  VARIANT_C = 'VARIANT_C',
}

/**
 * Performance Insight
 */
export interface PerformanceInsight {
  id: string;

  // What is being measured
  insightType: InsightType;
  entityId: string;

  // Agent context
  agentId: string | null;
  agentType: string | null;

  // Metrics
  successScore: number | null;
  qualityScore: number | null;
  efficiencyScore: number | null;
  speedScore: number | null;

  // Detailed metrics
  metrics: Record<string, any> | null;

  // Performance data
  executionTimeMs: number | null;
  tokensUsed: number | null;
  apiCallsMade: number | null;
  errorsEncountered: number | null;

  // Outcome tracking
  achievedGoal: boolean | null;
  goalCompletionPercentage: number | null;

  // Comparative analysis
  vsBenchmarkDelta: number | null;
  vsPreviousDelta: number | null;

  // Insights & learnings
  insightSummary: string | null;
  keyLearnings: string[] | null;
  improvementSuggestions: string[] | null;

  // Context
  context: Record<string, any> | null;

  // Timestamps
  measuredAt: Date;
  createdAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * A/B Experiment
 */
export interface ABExperiment {
  id: string;

  // Experiment metadata
  name: string;
  description: string | null;
  hypothesis: string | null;

  // Configuration
  experimentType: string;
  targetEntityType: InsightType;

  // Status
  status: ExperimentStatus;

  // Traffic allocation
  trafficAllocation: number;

  // Success criteria
  primaryMetric: MetricType;
  successThreshold: number | null;
  minimumSampleSize: number;

  // Results
  winningVariantId: string | null;
  confidenceLevel: number | null;

  // Lifecycle
  startedAt: Date | null;
  endedAt: Date | null;

  // Ownership
  createdBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Experiment Variant
 */
export interface ExperimentVariant {
  id: string;

  // Relationships
  experimentId: string;

  // Variant metadata
  variantType: VariantType;
  variantName: string;
  description: string | null;

  // Configuration
  configuration: Record<string, any>;

  // Traffic allocation
  trafficPercentage: number;

  // Results
  sampleSize: number;
  successCount: number;
  totalRuns: number;

  // Aggregated metrics
  avgSuccessScore: number | null;
  avgQualityScore: number | null;
  avgEfficiencyScore: number | null;
  avgExecutionTimeMs: number | null;

  // Detailed metrics
  metricsSummary: Record<string, any> | null;

  // Performance vs control
  liftVsControl: number | null;
  statisticalSignificance: number | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Agent Benchmark
 */
export interface AgentBenchmark {
  id: string;

  // Agent identification
  agentType: string;
  taskType: string | null;

  // Benchmark metrics
  expectedSuccessRate: number;
  expectedQualityScore: number;
  expectedEfficiencyScore: number;
  expectedExecutionTimeMs: number | null;

  // Performance thresholds
  minimumAcceptableSuccess: number | null;
  minimumAcceptableQuality: number | null;

  // Context
  description: string | null;
  sampleSize: number;

  // Metadata
  isSystemBenchmark: boolean;
  isActive: boolean;

  // Timestamps
  lastUpdated: Date;
  createdAt: Date;

  // Multi-tenancy
  organizationId: string | null;
}

/**
 * Performance Feedback
 */
export interface PerformanceFeedback {
  id: string;

  // What is being reviewed
  insightId: string | null;
  entityType: InsightType;
  entityId: string;

  // Feedback details
  feedbackType: string;
  feedbackSource: string | null;

  // Ratings
  userSatisfactionScore: number | null;
  qualityRating: number | null;

  // Qualitative feedback
  feedbackText: string | null;
  whatWorkedWell: string[] | null;
  whatNeedsImprovement: string[] | null;

  // Structured feedback
  ratings: Record<string, number> | null;

  // Impact tracking
  wasHelpful: boolean | null;
  ledToImprovement: boolean | null;

  // Timestamps
  submittedBy: string | null;
  submittedAt: Date;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Experiment Assignment
 */
export interface ExperimentAssignment {
  id: string;

  // Assignment details
  experimentId: string;
  variantId: string;

  // What was assigned
  entityType: InsightType;
  entityId: string;

  // Agent context
  agentId: string | null;

  // Outcome tracking
  outcomeRecorded: boolean;
  successScore: number | null;
  qualityScore: number | null;

  // Timestamps
  assignedAt: Date;
  completedAt: Date | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Input for creating a performance insight
 */
export interface CreatePerformanceInsightInput {
  insightType: InsightType;
  entityId: string;
  agentId?: string;
  agentType?: string;
  successScore?: number;
  qualityScore?: number;
  efficiencyScore?: number;
  speedScore?: number;
  metrics?: Record<string, any>;
  executionTimeMs?: number;
  tokensUsed?: number;
  apiCallsMade?: number;
  errorsEncountered?: number;
  achievedGoal?: boolean;
  goalCompletionPercentage?: number;
  vsBenchmarkDelta?: number;
  vsPreviousDelta?: number;
  insightSummary?: string;
  keyLearnings?: string[];
  improvementSuggestions?: string[];
  context?: Record<string, any>;
  organizationId: string;
}

/**
 * Input for creating an A/B experiment
 */
export interface CreateABExperimentInput {
  name: string;
  description?: string;
  hypothesis?: string;
  experimentType: string;
  targetEntityType: InsightType;
  trafficAllocation?: number;
  primaryMetric: MetricType;
  successThreshold?: number;
  minimumSampleSize?: number;
  organizationId: string;
}

/**
 * Input for creating an experiment variant
 */
export interface CreateExperimentVariantInput {
  experimentId: string;
  variantType: VariantType;
  variantName: string;
  description?: string;
  configuration: Record<string, any>;
  trafficPercentage?: number;
  organizationId: string;
}

/**
 * Input for creating performance feedback
 */
export interface CreatePerformanceFeedbackInput {
  insightId?: string;
  entityType: InsightType;
  entityId: string;
  feedbackType: string;
  feedbackSource?: string;
  userSatisfactionScore?: number;
  qualityRating?: number;
  feedbackText?: string;
  whatWorkedWell?: string[];
  whatNeedsImprovement?: string[];
  ratings?: Record<string, number>;
  wasHelpful?: boolean;
  organizationId: string;
}

/**
 * Input for recording experiment outcome
 */
export interface RecordExperimentOutcomeInput {
  assignmentId: string;
  successScore: number;
  qualityScore: number;
  efficiencyScore: number;
  executionTimeMs: number;
}

/**
 * Performance trends data
 */
export interface PerformanceTrends {
  date: string;
  avgSuccessScore: number;
  avgQualityScore: number;
  totalRuns: number;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experiment: ABExperiment;
  variants: ExperimentVariant[];
  winningVariant: ExperimentVariant | null;
  isStatisticallySignificant: boolean;
  recommendation: string;
}

/**
 * Agent performance comparison
 */
export interface AgentPerformanceComparison {
  agentType: string;
  currentPerformance: {
    successScore: number;
    qualityScore: number;
    efficiencyScore: number;
  };
  benchmark: {
    expectedSuccessRate: number;
    expectedQualityScore: number;
    expectedEfficiencyScore: number;
  };
  delta: {
    successDelta: number;
    qualityDelta: number;
    efficiencyDelta: number;
  };
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'BELOW_EXPECTATION';
}

/**
 * Insight summary for dashboard
 */
export interface InsightSummary {
  totalInsights: number;
  avgSuccessScore: number;
  avgQualityScore: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  topPerformingAgents: Array<{
    agentType: string;
    avgScore: number;
  }>;
  topImprovementAreas: string[];
}

/**
 * A/B test assignment request
 */
export interface ABTestAssignmentRequest {
  experimentId: string;
  entityType: InsightType;
  entityId: string;
  agentId?: string;
  organizationId: string;
}

/**
 * A/B test assignment result
 */
export interface ABTestAssignmentResult {
  assignment: ExperimentAssignment;
  variant: ExperimentVariant;
  shouldParticipate: boolean;
}

/**
 * Quality metrics
 */
export interface QualityMetrics {
  overallScore: number;
  dimensions: {
    accuracy: number;
    completeness: number;
    relevance: number;
    creativity: number;
    professionalism: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvementRecommendations: string[];
}
