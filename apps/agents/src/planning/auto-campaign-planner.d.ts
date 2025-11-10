import type { CampaignPlanningRequest, CampaignPlanningOutput } from '@pravado/types';
export declare class AutoCampaignPlanner {
    planCampaign(request: CampaignPlanningRequest, organizationId: string): Promise<CampaignPlanningOutput>;
    private gatherOrganizationalContext;
    private retrieveCampaignMemories;
    private generateCampaignPlan;
    private enrichPlan;
    private estimateTargetContactCount;
    critiquePlan(plan: CampaignPlanningOutput, organizationId: string): Promise<{
        score: number;
        feedback: string[];
    }>;
    private storePlanningMemory;
}
export declare const autoCampaignPlanner: AutoCampaignPlanner;
//# sourceMappingURL=auto-campaign-planner.d.ts.map