import type { ExecutionGraphData, CampaignType, CampaignPlanningOutput } from '@pravado/types';
export interface CampaignTemplate {
    type: CampaignType;
    name: string;
    description: string;
    graphTemplate: ExecutionGraphData;
}
export declare const AI_STARTUP_LAUNCH_TEMPLATE: CampaignTemplate;
export declare const PRODUCT_ANNOUNCEMENT_TEMPLATE: CampaignTemplate;
export declare const THOUGHT_LEADERSHIP_TEMPLATE: CampaignTemplate;
export declare const CAMPAIGN_TEMPLATES: Map<CampaignType, CampaignTemplate>;
export declare function getCampaignTemplate(type: CampaignType): CampaignTemplate | null;
export declare function createExecutionGraphFromTemplate(template: CampaignTemplate, campaignPlan: CampaignPlanningOutput, campaignId: string): ExecutionGraphData;
export declare function listCampaignTemplates(): CampaignTemplate[];
//# sourceMappingURL=campaign-templates.d.ts.map