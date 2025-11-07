// =====================================================
// PR CAMPAIGN AGENT TEMPLATE
// =====================================================

import { RegisteredAgent, AgentCategory } from '@pravado/types';
import { z } from 'zod';

export const prCampaignTemplate: RegisteredAgent = {
  id: 'pr-campaign-planner',
  name: 'PR Campaign Planner',
  description: 'Generate complete PR campaign plans with objectives, messaging, and target contacts',
  category: 'PR' as AgentCategory,
  tags: ['pr', 'campaign', 'planning', 'strategy'],
  version: '1.0.0',
  isActive: true,
  config: {
    agentName: 'PR Campaign Planner',
    systemPrompt: `You are an expert PR strategist specializing in media campaigns.

Your task is to create comprehensive PR campaign plans that include:
- Clear campaign objectives aligned with business goals
- Key messaging and positioning statements
- Target audience identification
- Media outlet recommendations
- Timeline and milestones
- Success metrics

Context available:
- Company strategy: {{context.strategy}}
- Available contacts: {{context.contacts}}

Input data will include:
- Campaign focus/topic: {{input.campaignTopic}}
- Goals: {{input.goals}}
- Timeline: {{input.timeline}}

Generate a structured campaign plan in JSON format with the following schema:
{
  "campaignName": "string",
  "description": "string",
  "objectives": ["string"],
  "keyMessages": ["string"],
  "targetAudience": "string",
  "recommendedContacts": [{"contactId": "uuid", "reason": "string"}],
  "timeline": {
    "startDate": "ISO 8601",
    "endDate": "ISO 8601",
    "milestones": [{"date": "ISO 8601", "description": "string"}]
  },
  "successMetrics": [{"metric": "string", "target": "string"}],
  "budget": {"estimated": "number", "breakdown": [{"item": "string", "amount": "number"}]}
}`,
    inputSchema: {
      campaignTopic: z.string().min(5).describe('The main topic or focus of the campaign'),
      goals: z.array(z.string()).min(1).describe('Primary goals for the campaign'),
      timeline: z.string().optional().describe('Desired timeline (e.g., "3 months", "Q2 2025")'),
      budget: z.number().optional().describe('Budget in USD'),
      targetRegions: z.array(z.string()).optional().describe('Geographic regions to target'),
    },
    outputSchema: {
      campaignName: z.string(),
      description: z.string(),
      objectives: z.array(z.string()),
      keyMessages: z.array(z.string()),
      targetAudience: z.string(),
      recommendedContacts: z.array(
        z.object({
          contactId: z.string(),
          reason: z.string(),
        })
      ),
      timeline: z.object({
        startDate: z.string(),
        endDate: z.string(),
        milestones: z.array(
          z.object({
            date: z.string(),
            description: z.string(),
          })
        ),
      }),
      successMetrics: z.array(
        z.object({
          metric: z.string(),
          target: z.string(),
        })
      ),
      budget: z.object({
        estimated: z.number(),
        breakdown: z.array(
          z.object({
            item: z.string(),
            amount: z.number(),
          })
        ),
      }),
    },
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 3000,
    requiredTools: ['fetch-strategy', 'fetch-contacts', 'score-contacts'],
    contextSources: ['strategy', 'contacts'],
  },
};
