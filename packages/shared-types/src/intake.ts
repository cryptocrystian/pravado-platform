// =====================================================
// INTAKE TYPES
// =====================================================
// Types for the onboarding intake form data collection

export enum IntakeStep {
  BUSINESS_INFO = 'BUSINESS_INFO',
  GOALS = 'GOALS',
  COMPETITORS = 'COMPETITORS',
  BRAND_VOICE = 'BRAND_VOICE',
  CHANNELS = 'CHANNELS',
  REGIONS = 'REGIONS',
}

// Business Information Step
export interface BusinessInfo {
  businessName: string;
  industry: string;
  website: string;
  companySize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  foundedYear?: number;
}

// Goals and Objectives Step
export interface Goals {
  primaryGoals: string[]; // e.g., ["Brand Awareness", "Lead Generation", "Thought Leadership"]
  successMetrics: string[]; // e.g., ["Media Mentions", "Website Traffic", "Leads"]
  timeline?: string; // e.g., "3 months", "6 months", "1 year"
  budgetRange?: string; // e.g., "$1k-5k/mo", "$5k-10k/mo"
}

// Competitive Landscape
export interface Competitor {
  name: string;
  website?: string;
  strengths?: string;
}

export interface CompetitiveInfo {
  competitors: Competitor[];
  marketPosition?: 'LEADER' | 'CHALLENGER' | 'FOLLOWER' | 'NICHE';
  uniqueValueProposition: string;
}

// Brand Voice and Target Audience
export interface TargetAudience {
  demographics?: {
    ageRange?: string;
    location?: string;
    jobTitles?: string[];
    industries?: string[];
  };
  psychographics?: {
    interests?: string[];
    challenges?: string[];
    goals?: string[];
  };
  painPoints?: string[];
}

export interface BrandVoice {
  brandTone: string[]; // e.g., ["Professional", "Approachable", "Innovative"]
  brandAttributes: string[]; // e.g., ["Trustworthy", "Expert", "Cutting-edge"]
  targetAudience: TargetAudience;
  brandPersonality?: string; // Free-form description
}

// Channel Priorities
export interface ChannelPriorities {
  prPriority: number; // 1-5 scale
  contentPriority: number; // 1-5 scale
  seoPriority: number; // 1-5 scale
  preferredContentTypes: string[]; // e.g., ["Blog Posts", "Whitepapers", "Case Studies"]
}

// Geographic Targeting
export interface GeographicTargeting {
  primaryRegions: string[]; // e.g., ["North America", "Europe", "APAC"]
  languages: string[]; // e.g., ["English", "Spanish"]
  localConsiderations?: string; // Free-form for cultural nuances
}

// Additional Context
export interface AdditionalContext {
  additionalContext?: string;
  challenges: string[];
  existingAssets?: {
    hasWebsite?: boolean;
    hasBlog?: boolean;
    hasSocialMedia?: boolean;
    hasPressCoverage?: boolean;
    hasEmailList?: boolean;
  };
}

// Complete Intake Response
export interface IntakeResponse {
  id: string;
  sessionId: string;
  step: IntakeStep;

  // Step-specific data
  businessName?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  foundedYear?: number;

  primaryGoals?: string[];
  successMetrics?: string[];
  timeline?: string;
  budgetRange?: string;

  competitors?: Competitor[];
  marketPosition?: string;
  uniqueValueProposition?: string;

  brandTone?: string[];
  brandAttributes?: string[];
  targetAudience?: TargetAudience;
  brandPersonality?: string;

  prPriority?: number;
  contentPriority?: number;
  seoPriority?: number;
  preferredContentTypes?: string[];

  primaryRegions?: string[];
  languages?: string[];
  localConsiderations?: string;

  additionalContext?: string;
  challenges?: string[];
  existingAssets?: Record<string, unknown>;

  responseData?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

// Aggregated intake data for agent consumption
export interface IntakeSummary {
  businessInfo: BusinessInfo;
  goals: Goals;
  competitiveInfo: CompetitiveInfo;
  brandVoice: BrandVoice;
  channelPriorities: ChannelPriorities;
  geographicTargeting: GeographicTargeting;
  additionalContext: AdditionalContext;
}

// Form state for multi-step UI
export interface IntakeFormState {
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  formData: Partial<IntakeSummary>;
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Input types for creating/updating intake responses
export interface CreateIntakeResponseInput {
  sessionId: string;
  step: IntakeStep;
  data: Partial<IntakeResponse>;
}

export interface UpdateIntakeResponseInput {
  data: Partial<IntakeResponse>;
}
