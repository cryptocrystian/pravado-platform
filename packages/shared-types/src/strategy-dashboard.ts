// =====================================================
// STRATEGY DASHBOARD TYPES
// =====================================================

export enum ScorecardCategory {
  PR = 'PR',
  CONTENT = 'CONTENT',
  SEO = 'SEO',
  REACH = 'REACH',
  ENGAGEMENT = 'ENGAGEMENT',
  OVERALL = 'OVERALL',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

// =====================================================
// METRICS
// =====================================================

export interface CampaignMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface ContentMetrics {
  totalItems: number;
  publishedItems: number;
  avgSeoScore: number;
  avgReadabilityScore: number;
  totalWordCount: number;
}

export interface ContactMetrics {
  totalContacts: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTimeMs: number;
  totalTokensUsed: number;
  totalCost: number;
}

export interface StrategySummary {
  campaigns: CampaignMetrics;
  content: ContentMetrics;
  contacts: ContactMetrics;
  agents: AgentMetrics;
}

// =====================================================
// PERFORMANCE METRICS
// =====================================================

export interface PerformanceMetric {
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: TrendDirection;
}

export interface MetricTrend {
  date: string;
  value: number;
  label?: string;
}

export interface PerformanceTrends {
  pitchVolume: MetricTrend[];
  openRate: MetricTrend[];
  contentOutput: MetricTrend[];
  seoScore: MetricTrend[];
}

// =====================================================
// COVERAGE & REACH
// =====================================================

export interface TierCoverage {
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  count: number;
  percentage: number;
}

export interface TopicCoverage {
  topic: string;
  contactCount: number;
  pitchCount: number;
  coverageRate: number;
}

export interface CoverageHeatmap {
  tierCoverage: TierCoverage[];
  topicCoverage: TopicCoverage[];
  outletTypes: {
    type: string;
    count: number;
  }[];
}

// =====================================================
// STRATEGY SCORECARD
// =====================================================

export interface StrategyScorecard {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  category: ScorecardCategory;

  // Scores (0-100)
  score: number;
  prScore: number | null;
  contentScore: number | null;
  seoScore: number | null;
  reachScore: number | null;
  engagementScore: number | null;

  // Metrics Data
  metricsData: Record<string, any>;

  // Insights
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStrategyScorecardInput {
  periodStart: Date;
  periodEnd: Date;
  category: ScorecardCategory;
  organizationId: string;
}

// =====================================================
// DASHBOARD METRICS
// =====================================================

export interface DashboardMetrics {
  summary: StrategySummary;
  performanceMetrics: PerformanceMetric[];
  trends: PerformanceTrends;
  coverage: CoverageHeatmap;
  scorecard: StrategyScorecard | null;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  campaigns?: string[];
  contentFormats?: string[];
  tiers?: string[];
}
