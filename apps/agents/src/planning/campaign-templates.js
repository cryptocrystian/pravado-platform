"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPAIGN_TEMPLATES = exports.THOUGHT_LEADERSHIP_TEMPLATE = exports.PRODUCT_ANNOUNCEMENT_TEMPLATE = exports.AI_STARTUP_LAUNCH_TEMPLATE = void 0;
exports.getCampaignTemplate = getCampaignTemplate;
exports.createExecutionGraphFromTemplate = createExecutionGraphFromTemplate;
exports.listCampaignTemplates = listCampaignTemplates;
const logger_1 = require("../lib/logger");
exports.AI_STARTUP_LAUNCH_TEMPLATE = {
    type: 'AI_STARTUP_LAUNCH',
    name: 'AI Startup Launch',
    description: 'Comprehensive campaign for AI/ML startup product launches',
    graphTemplate: {
        nodes: [
            {
                id: 'segment-contacts',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Segment Target Contacts',
                    agent: 'crm-agent',
                    description: 'Identify and segment target journalists based on campaign criteria',
                },
            },
            {
                id: 'draft-generic',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Draft Generic Pitch',
                    agent: 'content-agent',
                    description: 'Create baseline pitch template with key messages',
                },
            },
            {
                id: 'personalize-tier1',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Personalize Tier 1 Pitches',
                    agent: 'content-agent',
                    description: 'Deep personalization for top-tier contacts',
                },
            },
            {
                id: 'personalize-tier2',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Personalize Tier 2 Pitches',
                    agent: 'content-agent',
                    description: 'Medium personalization for mid-tier contacts',
                },
            },
            {
                id: 'review-pitches',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Review & Approve Pitches',
                    agent: 'quality-agent',
                    description: 'Quality check and approve all pitches',
                },
            },
            {
                id: 'create-workflow',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Create Pitch Workflow',
                    agent: 'workflow-agent',
                    description: 'Set up automated pitch workflow with batching and timing',
                },
            },
            {
                id: 'execute-campaign',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Execute Campaign',
                    agent: 'execution-agent',
                    description: 'Deploy and monitor pitch delivery',
                },
            },
            {
                id: 'setup-monitoring',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Setup Monitoring',
                    agent: 'monitoring-agent',
                    description: 'Configure alerts and tracking for responses',
                },
            },
        ],
        edges: [
            { from: 'segment-contacts', to: 'draft-generic', type: 'SEQUENCE' },
            { from: 'draft-generic', to: 'personalize-tier1', type: 'PARALLEL' },
            { from: 'draft-generic', to: 'personalize-tier2', type: 'PARALLEL' },
            { from: 'personalize-tier1', to: 'review-pitches', type: 'SEQUENCE' },
            { from: 'personalize-tier2', to: 'review-pitches', type: 'SEQUENCE' },
            { from: 'review-pitches', to: 'create-workflow', type: 'SEQUENCE' },
            { from: 'create-workflow', to: 'execute-campaign', type: 'SEQUENCE' },
            { from: 'execute-campaign', to: 'setup-monitoring', type: 'SEQUENCE' },
        ],
        metadata: {
            maxDepth: 5,
            estimatedDuration: 480,
            riskScore: 0.3,
            requiresApproval: true,
        },
    },
};
exports.PRODUCT_ANNOUNCEMENT_TEMPLATE = {
    type: 'PRODUCT_ANNOUNCEMENT',
    name: 'Product Announcement',
    description: 'Standard product announcement campaign',
    graphTemplate: {
        nodes: [
            {
                id: 'identify-targets',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Identify Target Contacts',
                    agent: 'crm-agent',
                    description: 'Find journalists covering product category',
                },
            },
            {
                id: 'create-announcement',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Create Announcement Pitch',
                    agent: 'content-agent',
                    description: 'Draft product announcement pitch',
                },
            },
            {
                id: 'personalize-top-tier',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Personalize Top Tier',
                    agent: 'content-agent',
                    description: 'Customize for priority journalists',
                },
            },
            {
                id: 'schedule-send',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Schedule & Send',
                    agent: 'execution-agent',
                    description: 'Deploy pitches with timing optimization',
                },
            },
            {
                id: 'track-mentions',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Track Mentions',
                    agent: 'monitoring-agent',
                    description: 'Monitor for product mentions and coverage',
                },
            },
        ],
        edges: [
            { from: 'identify-targets', to: 'create-announcement', type: 'SEQUENCE' },
            { from: 'create-announcement', to: 'personalize-top-tier', type: 'SEQUENCE' },
            { from: 'personalize-top-tier', to: 'schedule-send', type: 'SEQUENCE' },
            { from: 'schedule-send', to: 'track-mentions', type: 'SEQUENCE' },
        ],
        metadata: {
            maxDepth: 4,
            estimatedDuration: 240,
            riskScore: 0.2,
            requiresApproval: false,
        },
    },
};
exports.THOUGHT_LEADERSHIP_TEMPLATE = {
    type: 'THOUGHT_LEADERSHIP',
    name: 'Thought Leadership',
    description: 'Executive visibility and expert positioning campaign',
    graphTemplate: {
        nodes: [
            {
                id: 'research-opportunities',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Research Opportunities',
                    agent: 'research-agent',
                    description: 'Find speaking, podcast, and article opportunities',
                },
            },
            {
                id: 'identify-contacts',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Identify Editorial Contacts',
                    agent: 'crm-agent',
                    description: 'Find editors and producers for thought leadership',
                },
            },
            {
                id: 'draft-pitches',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Draft Expert Pitches',
                    agent: 'content-agent',
                    description: 'Create thought leadership pitch angles',
                },
            },
            {
                id: 'personalize-all',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Personalize All Pitches',
                    agent: 'content-agent',
                    description: 'High-touch personalization for all targets',
                },
            },
            {
                id: 'execute-outreach',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Execute Outreach',
                    agent: 'execution-agent',
                    description: 'Deploy personalized outreach campaign',
                },
            },
            {
                id: 'track-engagement',
                taskId: null,
                type: 'TASK',
                status: 'PENDING',
                data: {
                    name: 'Track Engagement',
                    agent: 'monitoring-agent',
                    description: 'Monitor responses and opportunities',
                },
            },
        ],
        edges: [
            { from: 'research-opportunities', to: 'identify-contacts', type: 'SEQUENCE' },
            { from: 'identify-contacts', to: 'draft-pitches', type: 'SEQUENCE' },
            { from: 'draft-pitches', to: 'personalize-all', type: 'SEQUENCE' },
            { from: 'personalize-all', to: 'execute-outreach', type: 'SEQUENCE' },
            { from: 'execute-outreach', to: 'track-engagement', type: 'SEQUENCE' },
        ],
        metadata: {
            maxDepth: 5,
            estimatedDuration: 360,
            riskScore: 0.25,
            requiresApproval: true,
        },
    },
};
exports.CAMPAIGN_TEMPLATES = new Map([
    ['AI_STARTUP_LAUNCH', exports.AI_STARTUP_LAUNCH_TEMPLATE],
    ['PRODUCT_ANNOUNCEMENT', exports.PRODUCT_ANNOUNCEMENT_TEMPLATE],
    ['THOUGHT_LEADERSHIP', exports.THOUGHT_LEADERSHIP_TEMPLATE],
]);
function getCampaignTemplate(type) {
    return exports.CAMPAIGN_TEMPLATES.get(type) || null;
}
function createExecutionGraphFromTemplate(template, campaignPlan, campaignId) {
    logger_1.logger.info('[CampaignTemplates] Creating execution graph from template', {
        templateType: template.type,
        campaignId,
    });
    const graph = JSON.parse(JSON.stringify(template.graphTemplate));
    graph.nodes = graph.nodes.map((node) => {
        return {
            ...node,
            data: {
                ...node.data,
                campaignId,
                campaignPlan,
                ...(node.id.includes('segment') && {
                    contactCriteria: campaignPlan.contactCriteria,
                }),
                ...(node.id.includes('draft') && {
                    pitchThemes: campaignPlan.pitchPlan.themes,
                    keyMessages: campaignPlan.strategyDoc.keyMessages,
                }),
                ...(node.id.includes('personalize') && {
                    variables: campaignPlan.pitchPlan.variables,
                }),
                ...(node.id.includes('monitoring') && {
                    monitoringSetup: campaignPlan.metricsPlan.monitoring,
                }),
            },
        };
    });
    graph.metadata = {
        ...graph.metadata,
        campaignId,
        campaignType: template.type,
        planningTimestamp: new Date().toISOString(),
    };
    logger_1.logger.info('[CampaignTemplates] Execution graph created', {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
    });
    return graph;
}
function listCampaignTemplates() {
    return Array.from(exports.CAMPAIGN_TEMPLATES.values());
}
//# sourceMappingURL=campaign-templates.js.map