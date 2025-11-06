export interface SEOAudit {
  id: string;
  url: string;
  title: string | null;
  score: number | null;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  metrics: SEOMetrics;
  contentId: string | null;
  campaignId: string | null;
  auditedAt: Date;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
}

export interface SEOIssue {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  location?: string;
}

export interface SEORecommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  expectedImpact?: string;
}

export interface SEOMetrics {
  pageSpeed?: number;
  mobileUsability?: number;
  crawlability?: number;
  indexability?: number;
  linkProfile?: {
    internalLinks: number;
    externalLinks: number;
    brokenLinks: number;
  };
  contentQuality?: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
  };
}

export type CreateSEOAuditInput = Pick<SEOAudit, 'url' | 'organizationId'> & {
  title?: string;
  contentId?: string;
  campaignId?: string;
};
