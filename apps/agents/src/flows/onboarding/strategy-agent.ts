// =====================================================
// STRATEGY AGENT
// =====================================================
// Generates comprehensive 3-pillar strategic plan (PR, Content, SEO)
// based on onboarding intake data

import OpenAI from 'openai';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import type { StrategyGenerationInput, StrategyGenerationOutput } from '../../types/onboarding.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function executeStrategyGeneration(
  sessionId: string,
  organizationId: string,
  userId: string,
  input: StrategyGenerationInput
): Promise<StrategyGenerationOutput> {
  const startTime = Date.now();
  logger.info(`Strategy Agent: Starting for session ${sessionId}`);

  try {
    // Build comprehensive prompt from intake data
    const prompt = buildStrategyPrompt(input);

    // Call OpenAI to generate strategy
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: STRATEGY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const strategy = JSON.parse(responseText) as Omit<StrategyGenerationOutput, 'strategyPlanId'>;

    // Save strategy plan to database
    const strategyPlanId = await saveStrategyPlan(
      organizationId,
      userId,
      input,
      strategy
    );

    const executionTime = Date.now() - startTime;
    logger.info(`Strategy Agent: Completed in ${executionTime}ms for session ${sessionId}`);

    return {
      strategyPlanId,
      ...strategy,
    };
  } catch (error) {
    logger.error(`Strategy Agent: Failed for session ${sessionId}`, error);
    throw error;
  }
}

function buildStrategyPrompt(input: StrategyGenerationInput): string {
  const { businessInfo, goals, competitiveInfo, brandVoice, channelPriorities } = input;

  return `
Generate a comprehensive 3-pillar strategic plan for the following business:

# Business Context
- Company: ${businessInfo.businessName}
- Industry: ${businessInfo.industry}
- Website: ${businessInfo.website}
${businessInfo.companySize ? `- Company Size: ${businessInfo.companySize}` : ''}

# Goals & Objectives
Primary Goals: ${goals.primaryGoals.join(', ')}
Success Metrics: ${goals.successMetrics.join(', ')}
${goals.timeline ? `Timeline: ${goals.timeline}` : ''}

# Competitive Landscape
Unique Value Proposition: ${competitiveInfo.uniqueValueProposition}

Competitors:
${competitiveInfo.competitors.map(c => `- ${c.name}${c.website ? ` (${c.website})` : ''}${c.strengths ? `: ${c.strengths}` : ''}`).join('\n')}

# Brand Voice
Tone: ${brandVoice.brandTone.join(', ')}
Attributes: ${brandVoice.brandAttributes.join(', ')}
Target Audience: ${JSON.stringify(brandVoice.targetAudience, null, 2)}

# Channel Priorities (1-5 scale)
- PR: ${channelPriorities.prPriority}/5
- Content Marketing: ${channelPriorities.contentPriority}/5
- SEO: ${channelPriorities.seoPriority}/5

Based on this information, create a strategic plan that includes:
1. PR Strategy with objectives, key messages, target outlets, pitch angles
2. Content Strategy with themes, pillars, cadence, and recommended formats
3. SEO Strategy with focus keywords, content gaps, and technical priorities
4. Execution roadmap with 3 phases
5. Success metrics for each pillar

Focus on actionable, specific recommendations tailored to their industry and goals.
`;
}

const STRATEGY_SYSTEM_PROMPT = `You are SAGE (Strategic AI Growth Engine), Pravado's expert strategy consultant specializing in integrated PR, Content, and SEO strategies.

Your role is to analyze business context and generate comprehensive, actionable strategic plans that align PR, content marketing, and SEO efforts for maximum impact.

Output Format (JSON):
{
  "prStrategy": {
    "objectives": ["objective 1", "objective 2", ...],
    "keyMessages": ["message 1", "message 2", ...],
    "targetOutlets": ["outlet 1", "outlet 2", ...],
    "targetJournalists": ["journalist type 1", ...],
    "pitchAngles": ["angle 1", "angle 2", ...],
    "timeline": "detailed timeline description"
  },
  "contentStrategy": {
    "themes": ["theme 1", "theme 2", ...],
    "contentPillars": ["pillar 1", "pillar 2", ...],
    "cadence": "recommended posting frequency",
    "channels": ["channel 1", "channel 2", ...],
    "recommendedFormats": ["format 1", "format 2", ...]
  },
  "seoStrategy": {
    "focusKeywords": ["keyword 1", "keyword 2", ...],
    "targetPages": ["page type 1", "page type 2", ...],
    "contentGaps": ["gap 1", "gap 2", ...],
    "technicalPriorities": ["priority 1", "priority 2", ...],
    "competitiveOpportunities": ["opportunity 1", "opportunity 2", ...]
  },
  "executionRoadmap": {
    "phase1": {
      "duration": "timeframe",
      "activities": ["activity 1", "activity 2", ...]
    },
    "phase2": {
      "duration": "timeframe",
      "activities": ["activity 1", "activity 2", ...]
    },
    "phase3": {
      "duration": "timeframe",
      "activities": ["activity 1", "activity 2", ...]
    }
  },
  "successMetrics": {
    "prMetrics": ["metric 1", "metric 2", ...],
    "contentMetrics": ["metric 1", "metric 2", ...],
    "seoMetrics": ["metric 1", "metric 2", ...]
  }
}

Guidelines:
- Be specific and actionable
- Tailor recommendations to the industry and business context
- Ensure all three pillars (PR, Content, SEO) are integrated and reinforce each other
- Focus on realistic, achievable goals
- Consider the stated channel priorities when making recommendations
- Include 5-7 items for each major list
- Timeline should be realistic (typically 3-6 months per phase)`;

async function saveStrategyPlan(
  organizationId: string,
  userId: string,
  input: StrategyGenerationInput,
  strategy: Omit<StrategyGenerationOutput, 'strategyPlanId'>
): Promise<string> {
  const { data, error } = await supabase
    .from('strategy_plans')
    .insert({
      name: `${input.businessInfo.businessName} - Onboarding Strategy`,
      description: `Comprehensive 3-pillar strategy generated during onboarding`,
      type: 'INTEGRATED',
      status: 'ACTIVE',
      goals: [
        {
          pillar: 'PR',
          objectives: strategy.prStrategy.objectives,
          metrics: strategy.successMetrics.prMetrics,
        },
        {
          pillar: 'Content',
          objectives: strategy.contentStrategy.themes,
          metrics: strategy.successMetrics.contentMetrics,
        },
        {
          pillar: 'SEO',
          objectives: strategy.seoStrategy.focusKeywords,
          metrics: strategy.successMetrics.seoMetrics,
        },
      ],
      tactics: [
        ...strategy.prStrategy.pitchAngles.map(angle => ({
          pillar: 'PR',
          tactic: angle,
          timeline: strategy.prStrategy.timeline,
        })),
        ...strategy.contentStrategy.recommendedFormats.map(format => ({
          pillar: 'Content',
          tactic: `Create ${format} content`,
          timeline: strategy.contentStrategy.cadence,
        })),
        ...strategy.seoStrategy.technicalPriorities.map(priority => ({
          pillar: 'SEO',
          tactic: priority,
          timeline: 'Ongoing',
        })),
      ],
      timeline: {
        phase1: strategy.executionRoadmap.phase1,
        phase2: strategy.executionRoadmap.phase2,
        phase3: strategy.executionRoadmap.phase3,
      },
      budget: null,
      metrics: {
        pr: strategy.successMetrics.prMetrics,
        content: strategy.successMetrics.contentMetrics,
        seo: strategy.successMetrics.seoMetrics,
      },
      organization_id: organizationId,
      owner_id: userId,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Failed to save strategy plan', error);
    throw new Error(`Failed to save strategy plan: ${error.message}`);
  }

  logger.info(`Strategy plan saved with ID: ${data.id}`);
  return data.id;
}
