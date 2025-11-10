// =====================================================
// PR AGENT TYPES
// Sprint 67 Track B: Media Opportunity Agent
// =====================================================

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: Date;
  category: string;
  keywords: string[];
}

export interface MediaOpportunity {
  id?: string;
  organizationId: string;
  newsItemId: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  opportunityScore: number;
  relevanceScore: number;
  visibilityScore: number;
  freshnessScore: number;
  matchReasons: string[];
  keywords: string[];
  status: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OpportunityScoreComponents {
  relevance: number; // 0-100: How relevant to organization's focus areas
  visibility: number; // 0-100: Source authority and reach potential
  freshness: number; // 0-100: How recent (decays over time)
}

export interface ScanResult {
  scannedItems: number;
  opportunitiesFound: number;
  opportunities: MediaOpportunity[];
  scanDuration: number;
}
