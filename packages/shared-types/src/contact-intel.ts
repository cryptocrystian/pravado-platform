// =====================================================
// CONTACT INTELLIGENCE TYPES
// =====================================================

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ClusterGenerationMethod {
  AI_GENERATED = 'AI_GENERATED',
  MANUAL = 'MANUAL',
  RULE_BASED = 'RULE_BASED',
}

// =====================================================
// CONTACT CLUSTER
// =====================================================

export interface ContactCluster {
  id: string;
  name: string;
  description: string | null;
  generationMethod: ClusterGenerationMethod;

  // Clustering Criteria
  criteria: {
    topics?: string[];
    tier?: string;
    outletTypes?: string[];
    regions?: string[];
    keywords?: string[];
  };
  keywords: string[];
  topics: string[];

  // Tier Breakdown
  tierBreakdown: {
    TIER_1: number;
    TIER_2: number;
    TIER_3: number;
  };
  totalContacts: number;

  // AI Metadata
  confidenceScore: number | null;
  generationPrompt: string | null;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateContactClusterInput {
  name: string;
  description?: string;
  generationMethod?: ClusterGenerationMethod;
  criteria: {
    topics?: string[];
    tier?: string;
    outletTypes?: string[];
    regions?: string[];
    keywords?: string[];
  };
  keywords?: string[];
  topics?: string[];
  organizationId: string;
}

// =====================================================
// CONTACT SEGMENT
// =====================================================

export interface SegmentDefinition {
  tier?: string[];
  topics?: string[];
  regions?: string[];
  outletTypes?: string[];
  hasEmail?: boolean;
  lastContactedDays?: number;
  minReachScore?: number;
  keywords?: string[];
}

export interface ContactSegment {
  id: string;
  name: string;
  description: string | null;

  // Filter Query
  queryFilters: SegmentDefinition;

  // Dynamic vs Static
  isDynamic: boolean;
  matchCount: number;
  lastCalculatedAt: Date | null;

  // Organization
  organizationId: string;

  // Audit
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateContactSegmentInput {
  name: string;
  description?: string;
  queryFilters: SegmentDefinition;
  isDynamic?: boolean;
  organizationId: string;
}

export interface UpdateContactSegmentInput {
  name?: string;
  description?: string;
  queryFilters?: SegmentDefinition;
  isDynamic?: boolean;
}

// =====================================================
// CONTACT ENRICHMENT
// =====================================================

export interface ContactEnrichment {
  id: string;
  contactId: string;
  status: EnrichmentStatus;

  // AI-Generated Data
  topics: string[];
  tone: string | null;
  outletSentiment: string | null;
  reachScore: number | null;
  bioSummary: string | null;
  writingStyle: string | null;
  coverageThemes: string[];

  // Metadata
  enrichmentSource: string;
  confidenceScore: number | null;
  tokensUsed: number | null;
  processingTimeMs: number | null;

  // Error Handling
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContactEnrichmentInput {
  contactId: string;
  organizationId: string;
}

export interface EnrichmentResult {
  topics: string[];
  tone: string;
  outletSentiment: string;
  reachScore: number;
  bioSummary: string;
  writingStyle: string;
  coverageThemes: string[];
}

// =====================================================
// CONTACT SIMILARITY
// =====================================================

export interface ContactSimilarity {
  id: string;
  contactId: string;
  similarContactId: string;
  similarityScore: number;

  // Similarity Factors
  sharedTopics: string[];
  sharedRegions: string[];
  sameTier: boolean;
  sameOutletType: boolean;

  // Vector Embedding
  contactEmbedding: number[] | null;

  // Organization
  organizationId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface FindSimilarContactsResponse {
  contact: any; // Full contact object
  similarityScore: number;
  sharedFactors: {
    sharedTopics: string[];
    sharedRegions: string[];
    sameTier: boolean;
    sameOutletType: boolean;
  };
}

// =====================================================
// CLUSTERING RESULT
// =====================================================

export interface ClusteringResult {
  clusters: {
    name: string;
    description: string;
    criteria: {
      topics: string[];
      tier?: string;
      outletTypes: string[];
      keywords: string[];
    };
    contactIds: string[];
    confidence: number;
  }[];
  totalClustersGenerated: number;
  processingTimeMs: number;
}
