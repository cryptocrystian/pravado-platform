import { EventEmitter } from 'events';
import type { CampaignReadinessRequest, CampaignReadinessResult, ReadinessStatus, CampaignTargetingSummary } from '@pravado/types';
export declare class CampaignReadiness extends EventEmitter {
    constructor();
    calculateReadiness(request: CampaignReadinessRequest): Promise<CampaignReadinessResult>;
    getTargetingSummary(campaignId: string, organizationId: string): Promise<CampaignTargetingSummary>;
    monitorCampaignsReadiness(organizationId: string, statuses?: ReadinessStatus[]): Promise<CampaignReadinessResult[]>;
    getRecommendations(campaignId: string, organizationId: string): Promise<{
        critical: string[];
        important: string[];
        suggestions: string[];
    }>;
    canExecuteCampaign(campaignId: string, organizationId: string): Promise<{
        canExecute: boolean;
        blockers: string[];
        warnings: string[];
    }>;
    autoApproveMatches(campaignId: string, organizationId: string, options?: {
        minScore?: number;
        minTier?: 'A' | 'B' | 'C';
        maxCount?: number;
        dryRun?: boolean;
    }): Promise<{
        approved: number;
        skipped: number;
        matchIds: string[];
    }>;
    updateTargetingCriteria(campaignId: string, organizationId: string, criteria: any, triggerRematch?: boolean): Promise<void>;
}
export declare const campaignReadiness: CampaignReadiness;
//# sourceMappingURL=campaign-readiness.d.ts.map