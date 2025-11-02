// =====================================================
// ONBOARDING JOB TYPES
// =====================================================
// Type definitions for onboarding-specific agent jobs

export type OnboardingJobType = 'strategy' | 'planner';

export interface OnboardingJobData {
  type: OnboardingJobType;
  sessionId: string;
  organizationId: string;
  userId: string;
  strategyPlanId?: string; // Only for planner jobs
  input: Record<string, unknown>; // Intake summary
}

export interface StrategyGenerationInput {
  businessInfo: {
    businessName: string;
    industry: string;
    website: string;
    companySize?: string;
  };
  goals: {
    primaryGoals: string[];
    successMetrics: string[];
    timeline?: string;
  };
  competitiveInfo: {
    competitors: Array<{
      name: string;
      website?: string;
      strengths?: string;
    }>;
    uniqueValueProposition: string;
  };
  brandVoice: {
    brandTone: string[];
    brandAttributes: string[];
    targetAudience: Record<string, unknown>;
  };
  channelPriorities: {
    prPriority: number;
    contentPriority: number;
    seoPriority: number;
  };
}

export interface StrategyGenerationOutput {
  strategyPlanId: string;
  prStrategy: {
    objectives: string[];
    keyMessages: string[];
    targetOutlets: string[];
    targetJournalists: string[];
    pitchAngles: string[];
    timeline: string;
  };
  contentStrategy: {
    themes: string[];
    contentPillars: string[];
    cadence: string;
    channels: string[];
    recommendedFormats: string[];
  };
  seoStrategy: {
    focusKeywords: string[];
    targetPages: string[];
    contentGaps: string[];
    technicalPriorities: string[];
    competitiveOpportunities: string[];
  };
  executionRoadmap: {
    phase1: { duration: string; activities: string[] };
    phase2: { duration: string; activities: string[] };
    phase3: { duration: string; activities: string[] };
  };
  successMetrics: {
    prMetrics: string[];
    contentMetrics: string[];
    seoMetrics: string[];
  };
}

export interface PlannerExecutionOutput {
  contentCalendar: {
    items: Array<{
      id: string;
      title: string;
      type: string;
      description: string;
      scheduledFor: Date;
      channels: string[];
      keywords: string[];
    }>;
  };
  pressRelease: {
    id: string;
    title: string;
    subtitle: string;
    targetContacts: string[];
  } | null;
  seoAudit: {
    id: string;
    url: string;
    initialScore: number | null;
    issues: Array<{
      severity: string;
      category: string;
      description: string;
    }>;
    recommendations: Array<{
      priority: string;
      action: string;
      impact: string;
    }>;
  } | null;
}
