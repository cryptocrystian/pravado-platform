import type { MediaOpportunity, ScanResult } from './types';
export declare class MediaOpportunityAgent {
    scanForOpportunities(organizationId: string, focusKeywords?: string[], minScore?: number): Promise<ScanResult>;
    private calculateOpportunityScore;
    private calculateRelevance;
    private calculateVisibility;
    private calculateFreshness;
    private generateMatchReasons;
    saveOpportunities(opportunities: MediaOpportunity[]): Promise<void>;
    private getOrganizationStrategy;
}
export declare const mediaOpportunityAgent: MediaOpportunityAgent;
//# sourceMappingURL=media-opportunity.agent.d.ts.map