// =====================================================
// PLANNER AGENT
// =====================================================
// Generates actionable deliverables:
// - Content calendar (7-10 items)
// - Initial PR pitch
// - SEO audit recommendations

import OpenAI from 'openai';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import type {
  StrategyGenerationInput,
  StrategyGenerationOutput,
  PlannerExecutionOutput,
} from '../../types/onboarding.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function executePlannerTasks(
  sessionId: string,
  organizationId: string,
  userId: string,
  strategyPlanId: string,
  input: StrategyGenerationInput
): Promise<PlannerExecutionOutput> {
  const startTime = Date.now();
  logger.info(`Planner Agent: Starting for session ${sessionId}`);

  try {
    // Fetch the strategy plan
    const strategy = await fetchStrategyPlan(strategyPlanId);

    // Generate content calendar
    const contentCalendar = await generateContentCalendar(
      organizationId,
      userId,
      input,
      strategy
    );

    // Generate initial PR pitch
    const pressRelease = await generatePRPitch(
      organizationId,
      userId,
      input,
      strategy
    );

    // Generate SEO audit
    const seoAudit = await generateSEOAudit(
      organizationId,
      userId,
      input,
      strategy
    );

    const executionTime = Date.now() - startTime;
    logger.info(`Planner Agent: Completed in ${executionTime}ms for session ${sessionId}`);

    return {
      contentCalendar,
      pressRelease,
      seoAudit,
    };
  } catch (error) {
    logger.error(`Planner Agent: Failed for session ${sessionId}`, error);
    throw error;
  }
}

async function fetchStrategyPlan(strategyPlanId: string) {
  const { data, error } = await supabase
    .from('strategy_plans')
    .select('*')
    .eq('id', strategyPlanId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch strategy plan: ${error?.message}`);
  }

  return data;
}

async function generateContentCalendar(
  organizationId: string,
  userId: string,
  input: StrategyGenerationInput,
  strategy: any
) {
  logger.info('Generating content calendar...');

  const prompt = `
Generate a 30-day content calendar with 7-10 pieces of content based on this strategy:

Business: ${input.businessInfo.businessName}
Industry: ${input.businessInfo.industry}

Content Themes: ${strategy.metrics?.content?.join(', ') || 'General topics'}
Target Audience: ${JSON.stringify(input.brandVoice.targetAudience)}
Brand Tone: ${input.brandVoice.brandTone.join(', ')}

Create a diverse mix of content types (blog posts, social media, videos, infographics).
Schedule items across the next 30 days.
Each piece should align with the content strategy and business goals.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: CONTENT_CALENDAR_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('No response from OpenAI for content calendar');
  }

  const calendar = JSON.parse(responseText);

  // Save content items to database
  const contentIds: string[] = [];
  const items = [];

  for (const item of calendar.items || []) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (item.dayOffset || 0));

    const { data, error } = await supabase
      .from('content_items')
      .insert({
        title: item.title,
        type: item.type || 'BLOG_POST',
        status: 'DRAFT',
        channels: item.channels || ['BLOG'],
        content: item.description || '',
        summary: item.description,
        author_id: userId,
        scheduled_for: scheduledDate.toISOString(),
        metadata: {
          wordCount: 0,
          readingTime: 0,
          tags: item.keywords || [],
          targetAudience: [],
          tone: input.brandVoice.brandTone[0] || 'professional',
          customFields: {
            generatedDuringOnboarding: true,
            keywords: item.keywords || [],
          },
        },
        seo_data: item.keywords
          ? {
              metaTitle: item.title,
              metaDescription: item.description?.substring(0, 160) || '',
              keywords: item.keywords,
              slug: item.title.toLowerCase().replace(/\s+/g, '-'),
              canonicalUrl: null,
              focusKeyword: item.keywords[0] || null,
              readabilityScore: null,
              seoScore: null,
            }
          : null,
        agent_generated: true,
        organization_id: organizationId,
      })
      .select('id')
      .single();

    if (data) {
      contentIds.push(data.id);
      items.push({
        id: data.id,
        title: item.title,
        type: item.type,
        description: item.description,
        scheduledFor: scheduledDate,
        channels: item.channels || [],
        keywords: item.keywords || [],
      });
    }
  }

  logger.info(`Created ${contentIds.length} content items`);

  return {
    items,
  };
}

async function generatePRPitch(
  organizationId: string,
  userId: string,
  input: StrategyGenerationInput,
  strategy: any
) {
  logger.info('Generating PR pitch...');

  const prompt = `
Create an initial press release pitch for:

Business: ${input.businessInfo.businessName}
Industry: ${input.businessInfo.industry}
Unique Value Proposition: ${input.competitiveInfo.uniqueValueProposition}

Goals: ${input.goals.primaryGoals.join(', ')}

The pitch should be newsworthy, compelling, and tailored to the industry.
Focus on what makes this company's announcement interesting to journalists and their audiences.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: PR_PITCH_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('No response from OpenAI for PR pitch');
  }

  const pitch = JSON.parse(responseText);

  // Save press release to database
  const { data, error } = await supabase
    .from('press_releases')
    .insert({
      title: pitch.title,
      subtitle: pitch.subtitle || null,
      body: pitch.body,
      status: 'DRAFT',
      contact_list: [],
      embargo_until: null,
      published_at: null,
      distribution_channels: pitch.targetChannels || [],
      metadata: {
        generatedDuringOnboarding: true,
        targetOutlets: pitch.targetOutlets || [],
        pitchAngle: pitch.angle || '',
      },
      organization_id: organizationId,
      created_by: userId,
    })
    .select('id, title, subtitle')
    .single();

  if (error || !data) {
    logger.warn('Failed to save press release', error);
    return null;
  }

  logger.info(`Created press release: ${data.id}`);

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle || '',
    targetContacts: pitch.targetOutlets || [],
  };
}

async function generateSEOAudit(
  organizationId: string,
  userId: string,
  input: StrategyGenerationInput,
  strategy: any
) {
  logger.info('Generating SEO audit...');

  const prompt = `
Perform an initial SEO audit analysis for:

Website: ${input.businessInfo.website}
Industry: ${input.businessInfo.industry}
Business: ${input.businessInfo.businessName}

Focus Keywords: ${strategy.metrics?.seo?.slice(0, 5).join(', ') || 'Industry-relevant keywords'}

Provide:
1. Estimated baseline SEO score
2. Common issues for this industry
3. Priority recommendations
4. Quick wins
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: SEO_AUDIT_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.6,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('No response from OpenAI for SEO audit');
  }

  const audit = JSON.parse(responseText);

  // Save SEO audit to database
  const { data, error } = await supabase
    .from('seo_audits')
    .insert({
      url: input.businessInfo.website,
      title: `Initial SEO Audit - ${input.businessInfo.businessName}`,
      score: audit.score || null,
      issues: audit.issues || [],
      recommendations: audit.recommendations || [],
      metrics: {
        technical: audit.technicalScore || null,
        content: audit.contentScore || null,
        backlinks: audit.backlinkScore || null,
        performance: audit.performanceScore || null,
      },
      content_id: null,
      campaign_id: null,
      audited_at: new Date().toISOString(),
      organization_id: organizationId,
      created_by: userId,
    })
    .select('id, url, score')
    .single();

  if (error || !data) {
    logger.warn('Failed to save SEO audit', error);
    return null;
  }

  logger.info(`Created SEO audit: ${data.id}`);

  return {
    id: data.id,
    url: data.url,
    initialScore: data.score,
    issues: audit.issues || [],
    recommendations: audit.recommendations || [],
  };
}

// System prompts
const CONTENT_CALENDAR_SYSTEM_PROMPT = `You are a content strategist creating a 30-day content calendar.

Output Format (JSON):
{
  "items": [
    {
      "title": "Content title",
      "description": "Brief description of the content",
      "type": "BLOG_POST | SOCIAL_POST | VIDEO | INFOGRAPHIC | WHITEPAPER | CASE_STUDY",
      "dayOffset": 0-30,
      "channels": ["BLOG", "LINKEDIN", "TWITTER", etc],
      "keywords": ["keyword1", "keyword2", ...]
    }
  ]
}

Create 7-10 diverse, engaging pieces that align with the business goals.`;

const PR_PITCH_SYSTEM_PROMPT = `You are a PR professional crafting compelling press releases.

Output Format (JSON):
{
  "title": "Attention-grabbing headline",
  "subtitle": "Supporting headline",
  "body": "Full press release body (500-800 words)",
  "angle": "The newsworthy angle",
  "targetOutlets": ["Outlet 1", "Outlet 2", ...],
  "targetChannels": ["PRESS_RELEASE_WIRE", "EMAIL", ...]
}

Focus on newsworthiness, clarity, and industry relevance.`;

const SEO_AUDIT_SYSTEM_PROMPT = `You are an SEO expert performing website audits.

Output Format (JSON):
{
  "score": 0-100,
  "technicalScore": 0-100,
  "contentScore": 0-100,
  "backlinkScore": 0-100,
  "performanceScore": 0-100,
  "issues": [
    {
      "severity": "HIGH | MEDIUM | LOW",
      "category": "Technical | Content | Links | Performance",
      "description": "Issue description",
      "location": "Where the issue was found"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "action": "What to do",
      "impact": "Expected improvement",
      "effort": "Time/resources required"
    }
  ]
}

Provide actionable, specific recommendations.`;
