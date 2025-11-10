import type { AutonomousCampaign, CampaignPlanningRequest } from '@pravado/types';
export declare class AutoCampaignAgent {
    createCampaign(request: CampaignPlanningRequest, organizationId: string, userId: string): Promise<AutonomousCampaign>;
    executeCampaign(campaignId: string, organizationId: string, dryRun?: boolean): Promise<void>;
    updateCampaignProgress(campaignId: string, organizationId: string): Promise<void>;
    private storeCampaign;
    private createExecutionGoal;
    private setupCollaboration;
    private completeCampaign;
    private storeMemory;
    private getCampaign;
    private updateCampaignStatus;
    private mapToCampaign;
}
export declare const autoCampaignAgent: AutoCampaignAgent;
//# sourceMappingURL=auto-campaign.agent.d.ts.map