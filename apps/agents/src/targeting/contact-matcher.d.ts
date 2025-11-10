import { EventEmitter } from 'events';
import type { MatchContactsRequest, ContactMatchResult, CampaignContactMatch, BulkMatchResult, SuitableContactsRequest, TargetingSuggestion } from '@pravado/types';
export declare class ContactMatcher extends EventEmitter {
    constructor();
    matchContactsToCampaign(request: MatchContactsRequest): Promise<ContactMatchResult[]>;
    createBulkMatches(request: MatchContactsRequest): Promise<BulkMatchResult>;
    getSuitableContactsForTopics(request: SuitableContactsRequest): Promise<ContactMatchResult[]>;
    getCampaignMatches(campaignId: string, organizationId: string, filters?: {
        approved?: boolean;
        excluded?: boolean;
        minScore?: number;
    }): Promise<CampaignContactMatch[]>;
    approveMatch(matchId: string, userId: string, organizationId: string): Promise<CampaignContactMatch>;
    excludeMatch(matchId: string, userId: string, reason: string, organizationId: string): Promise<CampaignContactMatch>;
    private calculateReadiness;
    private transformMatch;
    generateSuggestions(campaignId: string, organizationId: string, agentId: string, context?: {
        campaignGoals?: string[];
        targetAudience?: string;
        contentThemes?: string[];
    }): Promise<TargetingSuggestion[]>;
}
export declare const contactMatcher: ContactMatcher;
//# sourceMappingURL=contact-matcher.d.ts.map