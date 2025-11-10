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
    relevance: number;
    visibility: number;
    freshness: number;
}
export interface ScanResult {
    scannedItems: number;
    opportunitiesFound: number;
    opportunities: MediaOpportunity[];
    scanDuration: number;
}
//# sourceMappingURL=types.d.ts.map