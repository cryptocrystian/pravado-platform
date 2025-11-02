// =====================================================
// CONTENT QUEUE - AI Agent Orchestration
// =====================================================

import { Queue, Worker, Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// =====================================================
// QUEUE SETUP
// =====================================================

export const contentQueue = new Queue('content', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});

// =====================================================
// WORKER: Content Idea Generation
// =====================================================

const contentWorker = new Worker(
  'content',
  async (job: Job) => {
    logger.info(`[ContentQueue] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case 'generate-content-ideas':
        return await generateContentIdeas(job);
      case 'enhance-content':
        return await enhanceContent(job);
      case 'seo-audit-url':
        return await seoAuditUrl(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection: redisConnection, concurrency: 3 }
);

// =====================================================
// AGENT: Content Idea Generation
// =====================================================

async function generateContentIdeas(job: Job) {
  const { strategyId, keywordClusterId, format, count, organizationId } = job.data;

  logger.info(`[IdeaAgent] Generating ${count || 5} content ideas`);

  let context = '';

  if (strategyId) {
    const { data: strategy } = await supabase.from('strategy_plans').select('*').eq('id', strategyId).single();
    if (strategy) {
      context += `Strategy: ${strategy.goals || ''}\nAudience: ${strategy.target_audience || ''}\n\n`;
    }
  }

  if (keywordClusterId) {
    const { data: cluster } = await supabase.from('keyword_clusters').select('*').eq('id', keywordClusterId).single();
    if (cluster) {
      context += `Keywords: ${cluster.cluster_keywords?.join(', ')}\nTopics: ${cluster.recommended_topics?.join(', ')}\n\n`;
    }
  }

  const systemPrompt = `You are an expert content strategist. Generate SEO-optimized content ideas.
Output JSON: {"ideas": [{"title":"...","slug":"...","excerpt":"...","metaDescription":"...","keywords":[],"outline":[],"format":"BLOG","confidence":0.85}]}`;

  const userPrompt = `Generate ${count || 5} content ideas:\n${context}${format ? `Format: ${format}\n` : ''}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{"ideas":[]}');
  logger.info(`[IdeaAgent] Generated ${result.ideas?.length || 0} ideas`);

  return { ideas: result.ideas || [] };
}

// =====================================================
// AGENT: Content Enhancer
// =====================================================

async function enhanceContent(job: Job) {
  const { contentItemId, organizationId } = job.data;

  logger.info(`[EnhancerAgent] Enhancing content: ${contentItemId}`);

  const { data: content } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', contentItemId)
    .eq('organization_id', organizationId)
    .single();

  if (!content || !content.body_md) {
    throw new Error('Content not found or has no body');
  }

  const wordCount = content.body_md.split(/\s+/).length;

  const systemPrompt = `Analyze content and output JSON: {"summary":"...","outline":[],"keywordsSuggested":[],"readabilityScore":65,"seoScore":0.75}`;
  const userPrompt = `Title: ${content.title}\nKeywords: ${content.keywords?.join(', ') || 'none'}\n\nContent: ${content.body_md.substring(0, 2000)}...`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');

  // Update content item with AI analysis
  await supabase
    .from('content_items')
    .update({
      ai_summary: analysis.summary || '',
      ai_outline: analysis.outline || [],
      ai_keywords_suggested: analysis.keywordsSuggested || [],
      word_count: wordCount,
      readability_score: analysis.readabilityScore || 50,
      seo_score: analysis.seoScore || 0.5,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentItemId);

  logger.info(`[EnhancerAgent] Enhanced content: ${contentItemId}`);
  return { success: true, contentItemId };
}

// =====================================================
// AGENT: SEO Audit
// =====================================================

async function seoAuditUrl(job: Job) {
  const { auditId, url } = job.data;

  logger.info(`[SEOAuditAgent] Auditing URL: ${url}`);

  // Mock SEO audit (in production, use Lighthouse/PageSpeed Insights API)
  const systemPrompt = `You are an SEO expert. Analyze the URL and provide scores and recommendations.
Output JSON: {
  "performanceScore": 0.85,
  "seoScore": 0.72,
  "accessibilityScore": 0.90,
  "bestPracticesScore": 0.88,
  "issues": [{"severity":"warning","message":"Missing meta description"}],
  "suggestions": [{"priority":"high","action":"Add meta description","impact":"Improve search visibility"}],
  "primaryKeywords": ["keyword1"],
  "wordCount": 1200,
  "readabilityScore": 65,
  "mobileFriendly": true
}`;

  const userPrompt = `Analyze this URL for SEO: ${url}\n\nProvide comprehensive SEO analysis.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const audit = JSON.parse(completion.choices[0].message.content || '{}');

    // Calculate overall score
    const overallScore = (
      (audit.performanceScore || 0) +
      (audit.seoScore || 0) +
      (audit.accessibilityScore || 0) +
      (audit.bestPracticesScore || 0)
    ) / 4;

    // Update audit record
    await supabase
      .from('seo_audits')
      .update({
        audit_score: overallScore,
        performance_score: audit.performanceScore,
        seo_score: audit.seoScore,
        accessibility_score: audit.accessibilityScore,
        best_practices_score: audit.bestPracticesScore,
        issues: audit.issues || [],
        suggestions: audit.suggestions || [],
        primary_keywords: audit.primaryKeywords || [],
        word_count: audit.wordCount,
        readability_score: audit.readabilityScore,
        mobile_friendly: audit.mobileFriendly,
        audited_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    logger.info(`[SEOAuditAgent] Completed audit: ${auditId} (score: ${overallScore.toFixed(2)})`);
    return { success: true, auditId, score: overallScore };
  } catch (error: any) {
    logger.error(`[SEOAuditAgent] Error: ${error.message}`);

    // Mark audit as failed
    await supabase
      .from('seo_audits')
      .update({
        issues: [{ severity: 'error', message: `Audit failed: ${error.message}` }],
        audited_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    throw error;
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

contentWorker.on('completed', (job) => {
  logger.info(`[ContentQueue] Job ${job.id} completed`);
});

contentWorker.on('failed', (job, error) => {
  logger.error(`[ContentQueue] Job ${job?.id} failed: ${error.message}`);
});

logger.info('[ContentQueue] Worker started');
