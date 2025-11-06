// =====================================================
// AUTONOMOUS CAMPAIGN TYPES
// =====================================================

/**
 * Autonomous campaign status enumeration
 */
export enum AutonomousCampaignStatus {
  PLANNING = 'PLANNING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Autonomous campaign type enumeration
 */
export enum AutonomousCampaignType {
  AI_STARTUP_LAUNCH = 'AI_STARTUP_LAUNCH',
  PRODUCT_ANNOUNCEMENT = 'PRODUCT_ANNOUNCEMENT',
  THOUGHT_LEADERSHIP = 'THOUGHT_LEADERSHIP',
  CRISIS_RESPONSE = 'CRISIS_RESPONSE',
  FUNDING_ANNOUNCEMENT = 'FUNDING_ANNOUNCEMENT',
  PARTNERSHIP_NEWS = 'PARTNERSHIP_NEWS',
  CUSTOM = 'CUSTOM',
}

/**
 * Campaign task type enumeration
 */
export enum CampaignTaskType {
  SEGMENT = 'SEGMENT',
  DRAFT = 'DRAFT',
  PERSONALIZE = 'PERSONALIZE',
  REVIEW = 'REVIEW',
  CREATE_WORKFLOW = 'CREATE_WORKFLOW',
  EXECUTE = 'EXECUTE',
  MONITOR = 'MONITOR',
  ANALYZE = 'ANALYZE',
}

/**
 * Targeting strategy for campaigns
 */
export interface CampaignTargeting {
  outletTypes: string[];
  contactTiers: string[];
  topics: string[];
  locations?: string[];
  minRelationshipScore?: number;
  maxContactsPerOutlet?: number;
}

/**
 * Personalization strategy
 */
export interface PersonalizationStrategy {
  tier1: string; // High personalization level
  tier2: string; // Medium personalization level
  tier3?: string; // Low personalization level
  researchDepth: 'high' | 'medium' | 'low';
  includeRecentArticles: boolean;
  includeOutletFocus: boolean;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  batchSize: number;
  delayBetweenBatches: number; // seconds
  followupDays: number[];
  maxFollowups: number;
  stopOnResponse: boolean;
}

/**
 * Monitoring setup
 */
export interface MonitoringSetup {
  trackMentions: boolean;
  alertOnResponse: boolean;
  alertOnPlacement: boolean;
  thresholds: {
    responseRate?: number;
    placementRate?: number;
    minQualityScore?: number;
  };
}

/**
 * Campaign KPIs
 */
export interface CampaignKPIs {
  targetPitches: number;
  targetResponseRate: number;
  targetPlacements: number;
  targetReach?: number;
  timeline?: string; // e.g., "2 weeks"
}

/**
 * Success criteria
 */
export interface SuccessCriteria {
  minResponseRate?: number;
  minPlacementRate?: number;
  minPlacements?: number;
  minQualityScore?: number;
}

/**
 * Planning output from agent
 */
export interface CampaignPlanningOutput {
  strategyDoc: {
    objectives: string[];
    targetOutlets: string[];
    timeline: string;
    keyMessages: string[];
  };
  pitchPlan: {
    themes: string[];
    templates: string[];
    variables: Record<string, string>;
  };
  contactCriteria: CampaignTargeting;
  metricsPlan: {
    kpis: CampaignKPIs;
    monitoring: MonitoringSetup;
  };
}

/**
 * Execution metadata
 */
export interface ExecutionMetadata {
  dagConfig: Record<string, any>;
  taskResults: Record<string, any>;
  errors: string[];
  warnings: string[];
}

/**
 * Campaign learnings
 */
export interface CampaignLearnings {
  whatWorked: string[];
  whatDidntWork: string[];
  improvements: string[];
  reusableStrategies: string[];
}

/**
 * Autonomous Campaign
 */
export interface AutonomousCampaign {
  id: string;

  // Campaign metadata
  title: string;
  description: string | null;
  campaignType: AutonomousCampaignType;

  // Lifecycle
  status: AutonomousCampaignStatus;
  agentCreated: boolean;

  // Agent information
  planningAgentId: string | null;
  orchestratorAgentId: string | null;

  // Prompt & planning
  originalPrompt: string | null;
  planningOutput: CampaignPlanningOutput | null;

  // Execution
  executionMetadata: ExecutionMetadata | null;
  executionGraphId: string | null;

  // Targeting
  targetContactCriteria: CampaignTargeting | null;
  targetOutletTypes: string[];
  targetTopics: string[];

  // Personalization
  personalizationStrategy: PersonalizationStrategy | null;
  pitchTheme: string | null;

  // Workflow
  workflowConfig: WorkflowConfig | null;
  batchSize: number;
  delayBetweenBatches: number;

  // Monitoring
  monitoringSetup: MonitoringSetup | null;
  kpis: CampaignKPIs | null;
  successCriteria: SuccessCriteria | null;

  // Results
  totalContactsTargeted: number;
  pitchesSent: number;
  responsesReceived: number;
  placementsAchieved: number;

  // Quality & learning
  qualityScore: number | null;
  learnings: CampaignLearnings | null;

  // Scheduling
  scheduledStart: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;

  // Approval
  requiresApproval: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Campaign Template
 */
export interface CampaignTemplate {
  id: string;

  // Template metadata
  name: string;
  description: string | null;
  campaignType: AutonomousCampaignType;

  // Template configuration
  templateConfig: Record<string, any>;
  executionGraphTemplate: Record<string, any> | null;

  // Usage tracking
  usageCount: number;
  successRate: number | null;

  // Ownership
  isSystemTemplate: boolean;
  createdByAgent: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Multi-tenancy
  organizationId: string | null;
}

/**
 * Campaign Task
 */
export interface CampaignTask {
  id: string;

  // Relationships
  campaignId: string;
  agentTaskId: string | null;

  // Task metadata
  taskType: CampaignTaskType;
  taskOrder: number;

  // Configuration & results
  taskConfig: Record<string, any> | null;
  taskOutput: Record<string, any> | null;

  // Timestamps
  createdAt: Date;
  completedAt: Date | null;

  // Multi-tenancy
  organizationId: string;
}

/**
 * Campaign Statistics
 */
export interface CampaignStatistics {
  campaignId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  progressPercentage: number;
}

/**
 * Input for creating an autonomous campaign
 */
export interface CreateAutonomousCampaignInput {
  title?: string;
  description?: string;
  campaignType?: AutonomousCampaignType;
  originalPrompt: string; // Natural language campaign goal
  requiresApproval?: boolean;
  scheduledStart?: Date;
  organizationId: string;
  createdBy: string;
}

/**
 * Input for updating a campaign
 */
export interface UpdateAutonomousCampaignInput {
  title?: string;
  description?: string;
  status?: AutonomousCampaignStatus;
  planningOutput?: CampaignPlanningOutput;
  executionMetadata?: ExecutionMetadata;
  qualityScore?: number;
  learnings?: CampaignLearnings;
}

/**
 * Campaign planning request (agent input)
 */
export interface CampaignPlanningRequest {
  prompt: string;
  campaignType?: AutonomousCampaignType;
  constraints?: {
    maxContacts?: number;
    maxBudget?: number;
    timeline?: string;
  };
  preferences?: {
    personalizationLevel?: 'high' | 'medium' | 'low';
    outletTypes?: string[];
    topics?: string[];
  };
}

/**
 * Campaign execution request
 */
export interface CampaignExecutionRequest {
  campaignId: string;
  dryRun?: boolean;
  skipApproval?: boolean;
}

/**
 * Campaign progress update
 */
export interface CampaignProgressUpdate {
  campaignId: string;
  currentTask: string;
  completedTasks: number;
  totalTasks: number;
  status: AutonomousCampaignStatus;
  errors: string[];
}

/**
 * Template application result
 */
export interface TemplateApplicationResult {
  campaign: AutonomousCampaign;
  executionGraph: Record<string, any>;
  tasks: CampaignTask[];
}
