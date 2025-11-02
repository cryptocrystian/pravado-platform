// =====================================================
// CONTENT & SEO SERVICE
// =====================================================

import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import {
  KeywordCluster,
  ContentItemNew,
  ContentCalendar,
  CalendarDay,
  SEOAudit,
  ContentTask,
  CreateKeywordClusterInput,
  UpdateKeywordClusterInput,
  CreateContentItemInput,
  UpdateContentItemInput,
  CreateContentCalendarInput,
  CreateSEOAuditInput,
  CreateContentTaskInput,
  UpdateContentTaskInput,
  GenerateContentIdeasInput,
  GeneratedContentIdea,
  ContentStats,
} from '@pravado/shared-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// KEYWORD CLUSTERS
// =====================================================

export async function createKeywordCluster(input: CreateKeywordClusterInput, userId: string) {
  const { data, error } = await supabase.from('keyword_clusters').insert({
    ...input, cluster_keywords: input.clusterKeywords, primary_keyword: input.primaryKeyword,
    search_volume: input.searchVolume, difficulty_score: input.difficultyScore,
    recommended_topics: input.recommendedTopics, content_gaps: input.contentGaps,
    avg_cpc: input.avgCpc, competition_level: input.competitionLevel,
    trend_direction: input.trendDirection, organization_id: input.organizationId,
    created_by: userId, updated_by: userId,
  }).select().single();
  if (error) throw new Error(`Failed to create keyword cluster: ${error.message}`);
  return mapKeywordClusterFromDb(data);
}

export async function listKeywordClusters(organizationId: string) {
  const { data, error } = await supabase.from('keyword_clusters').select()
    .eq('organization_id', organizationId).is('deleted_at', null)
    .order('search_volume', { ascending: false });
  if (error) throw new Error(`Failed to list keyword clusters: ${error.message}`);
  return (data || []).map(mapKeywordClusterFromDb);
}

// =====================================================
// CONTENT ITEMS
// =====================================================

export async function createContentItem(input: CreateContentItemInput, userId: string) {
  let aiData = {};
  if (input.bodyMd) {
    const aiContent = await generateAIContentEnhancements(input.title, input.bodyMd, input.keywords);
    aiData = {
      ai_summary: aiContent.summary, ai_outline: aiContent.outline,
      ai_keywords_suggested: aiContent.keywordsSuggested, word_count: aiContent.wordCount,
      readability_score: aiContent.readabilityScore, seo_score: aiContent.seoScore,
    };
  }

  const { data, error } = await supabase.from('content_items').insert({
    title: input.title, slug: input.slug, excerpt: input.excerpt, body_md: input.bodyMd,
    status: input.status || 'IDEA', format: input.format, scheduled_date: input.scheduledDate,
    meta_title: input.metaTitle, meta_description: input.metaDescription, keywords: input.keywords,
    keyword_cluster_id: input.keywordClusterId, strategy_id: input.strategyId,
    featured_image_url: input.featuredImageUrl, attachments: input.attachments,
    target_audience: input.targetAudience, buyer_stage: input.buyerStage,
    distribution_channels: input.distributionChannels, canonical_url: input.canonicalUrl,
    team_id: input.teamId, assigned_to: input.assignedTo, organization_id: input.organizationId,
    created_by: userId, updated_by: userId, ...aiData,
  }).select().single();

  if (error) throw new Error(`Failed to create content item: ${error.message}`);
  return mapContentItemFromDb(data);
}

export async function getContentItemById(contentId: string, organizationId: string) {
  const { data, error } = await supabase.from('content_items').select()
    .eq('id', contentId).eq('organization_id', organizationId).is('deleted_at', null).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get content item: ${error.message}`);
  }
  return mapContentItemFromDb(data);
}

export async function listContentItems(organizationId: string, filters?: any) {
  let query = supabase.from('content_items').select()
    .eq('organization_id', organizationId).is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.format) query = query.eq('format', filters.format);
  if (filters?.clusterId) query = query.eq('keyword_cluster_id', filters.clusterId);
  if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list content items: ${error.message}`);
  return (data || []).map(mapContentItemFromDb);
}

export async function updateContentItem(contentId: string, input: UpdateContentItemInput, userId: string, organizationId: string) {
  const updateData: any = {};

  if (input.bodyMd) {
    const content = await getContentItemById(contentId, organizationId);
    if (content) {
      const aiContent = await generateAIContentEnhancements(
        input.title || content.title, input.bodyMd, input.keywords || content.keywords
      );
      Object.assign(updateData, {
        ai_summary: aiContent.summary, ai_outline: aiContent.outline,
        ai_keywords_suggested: aiContent.keywordsSuggested, word_count: aiContent.wordCount,
        readability_score: aiContent.readabilityScore, seo_score: aiContent.seoScore,
      });
    }
  }

  const dbData: any = { ...input };
  if (input.scheduledDate !== undefined) dbData.scheduled_date = input.scheduledDate;
  if (input.publishedAt !== undefined) dbData.published_at = input.publishedAt;
  if (input.metaTitle !== undefined) dbData.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) dbData.meta_description = input.metaDescription;
  if (input.seoScore !== undefined) dbData.seo_score = input.seoScore;
  if (input.readabilityScore !== undefined) dbData.readability_score = input.readabilityScore;
  if (input.keywordClusterId !== undefined) dbData.keyword_cluster_id = input.keywordClusterId;
  if (input.strategyId !== undefined) dbData.strategy_id = input.strategyId;
  if (input.featuredImageUrl !== undefined) dbData.featured_image_url = input.featuredImageUrl;
  if (input.targetAudience !== undefined) dbData.target_audience = input.targetAudience;
  if (input.buyerStage !== undefined) dbData.buyer_stage = input.buyerStage;
  if (input.distributionChannels) dbData.distribution_channels = input.distributionChannels;
  if (input.canonicalUrl !== undefined) dbData.canonical_url = input.canonicalUrl;
  if (input.engagementScore !== undefined) dbData.engagement_score = input.engagementScore;
  if (input.teamId !== undefined) dbData.team_id = input.teamId;
  if (input.assignedTo !== undefined) dbData.assigned_to = input.assignedTo;
  if (input.bodyMd !== undefined) dbData.body_md = input.bodyMd;

  const { data, error } = await supabase.from('content_items').update({
    ...dbData, ...updateData, updated_by: userId, updated_at: new Date().toISOString(),
  }).eq('id', contentId).eq('organization_id', organizationId).is('deleted_at', null).select().single();

  if (error) throw new Error(`Failed to update content item: ${error.message}`);
  return mapContentItemFromDb(data);
}

export async function deleteContentItem(contentId: string, organizationId: string) {
  const { error } = await supabase.from('content_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contentId).eq('organization_id', organizationId);
  if (error) throw new Error(`Failed to delete content item: ${error.message}`);
}

export async function getContentStats(organizationId: string): Promise<ContentStats> {
  const { data, error } = await supabase.rpc('get_content_stats', { org_uuid: organizationId });
  if (error) throw new Error(`Failed to get content stats: ${error.message}`);
  return {
    totalContent: data.total_content || 0, ideasCount: data.ideas_count || 0,
    plannedCount: data.planned_count || 0, inProgressCount: data.in_progress_count || 0,
    completedCount: data.completed_count || 0, avgSeoScore: data.avg_seo_score,
    topPerforming: data.top_performing || [],
  };
}

// =====================================================
// CONTENT CALENDAR
// =====================================================

export async function getContentCalendar(organizationId: string, month: number, year: number): Promise<CalendarDay[]> {
  const { data, error } = await supabase.rpc('get_content_calendar', {
    org_uuid: organizationId, cal_month: month, cal_year: year,
  });
  if (error) throw new Error(`Failed to get content calendar: ${error.message}`);
  return (data || []).map((day: any) => ({
    date: new Date(day.date),
    contentItems: day.content_items || [],
  }));
}

export async function createContentCalendar(input: CreateContentCalendarInput, userId: string) {
  const { data, error } = await supabase.from('content_calendars').insert({
    month: input.month, year: input.year, theme: input.theme, goals: input.goals,
    notes: input.notes, organization_id: input.organizationId, created_by: userId, updated_by: userId,
  }).select().single();
  if (error) throw new Error(`Failed to create content calendar: ${error.message}`);
  return mapContentCalendarFromDb(data);
}

// =====================================================
// SEO AUDITS
// =====================================================

export async function createSEOAudit(input: CreateSEOAuditInput, userId: string) {
  const { data, error } = await supabase.from('seo_audits').insert({
    url: input.url, title: input.title, content_item_id: input.contentItemId,
    organization_id: input.organizationId, audit_type: 'manual', created_by: userId,
  }).select().single();
  if (error) throw new Error(`Failed to create SEO audit: ${error.message}`);
  return mapSEOAuditFromDb(data);
}

export async function listSEOAudits(organizationId: string, contentItemId?: string) {
  let query = supabase.from('seo_audits').select()
    .eq('organization_id', organizationId).is('deleted_at', null)
    .order('audited_at', { ascending: false });
  if (contentItemId) query = query.eq('content_item_id', contentItemId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list SEO audits: ${error.message}`);
  return (data || []).map(mapSEOAuditFromDb);
}

// =====================================================
// CONTENT TASKS
// =====================================================

export async function createContentTask(input: CreateContentTaskInput, userId: string) {
  const { data, error } = await supabase.from('content_tasks').insert({
    title: input.title, description: input.description, type: input.type,
    status: input.status || 'TODO', priority: input.priority || 3, due_date: input.dueDate,
    assigned_to: input.assignedTo, content_item_id: input.contentItemId, notes: input.notes,
    attachments: input.attachments, estimated_hours: input.estimatedHours,
    organization_id: input.organizationId, created_by: userId, updated_by: userId,
  }).select().single();
  if (error) throw new Error(`Failed to create content task: ${error.message}`);
  return mapContentTaskFromDb(data);
}

export async function listContentTasks(contentItemId: string, organizationId: string) {
  const { data, error } = await supabase.from('content_tasks').select()
    .eq('content_item_id', contentItemId).eq('organization_id', organizationId)
    .is('deleted_at', null).order('priority').order('due_date');
  if (error) throw new Error(`Failed to list content tasks: ${error.message}`);
  return (data || []).map(mapContentTaskFromDb);
}

export async function updateContentTask(taskId: string, input: UpdateContentTaskInput, userId: string, organizationId: string) {
  const updateData: any = { ...input };
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
  if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;
  if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
  if (input.estimatedHours !== undefined) updateData.estimated_hours = input.estimatedHours;
  if (input.actualHours !== undefined) updateData.actual_hours = input.actualHours;

  const { data, error } = await supabase.from('content_tasks').update({
    ...input, ...updateData, updated_by: userId, updated_at: new Date().toISOString(),
  }).eq('id', taskId).eq('organization_id', organizationId).is('deleted_at', null).select().single();

  if (error) throw new Error(`Failed to update content task: ${error.message}`);
  return mapContentTaskFromDb(data);
}

// =====================================================
// AI CONTENT GENERATION
// =====================================================

export async function generateContentIdeas(input: GenerateContentIdeasInput, organizationId: string): Promise<GeneratedContentIdea[]> {
  let context = '';

  if (input.strategyId) {
    const { data: strategy } = await supabase.from('strategy_plans').select('*').eq('id', input.strategyId).single();
    if (strategy) {
      context += `Strategy: Goals=${strategy.goals}, Audience=${strategy.target_audience}\n\n`;
    }
  }

  if (input.keywordClusterId) {
    const { data: cluster } = await supabase.from('keyword_clusters').select('*').eq('id', input.keywordClusterId).single();
    if (cluster) {
      context += `Keywords: ${cluster.cluster_keywords?.join(', ')}\nTopics: ${cluster.recommended_topics?.join(', ')}\n\n`;
    }
  }

  const systemPrompt = `You are an expert content strategist. Generate SEO-optimized content ideas.
Output JSON: {"ideas": [{"title":"...","slug":"...","excerpt":"...","metaDescription":"...","keywords":[],"outline":[],"format":"BLOG","confidence":0.85}]}`;

  const userPrompt = `Generate ${input.count || 5} content ideas:\n${context}${input.format ? `Format: ${input.format}\n` : ''}${input.targetAudience ? `Audience: ${input.targetAudience}\n` : ''}${input.buyerStage ? `Stage: ${input.buyerStage}\n` : ''}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' }, temperature: 0.8,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{"ideas":[]}');
  return result.ideas || [];
}

async function generateAIContentEnhancements(title: string, bodyMd: string, keywords?: string[]) {
  const wordCount = bodyMd.split(/\s+/).length;
  const systemPrompt = `Analyze content and output JSON: {"summary":"...","outline":[],"keywordsSuggested":[],"readabilityScore":65,"seoScore":0.75}`;
  const userPrompt = `Title: ${title}\n${keywords ? `Keywords: ${keywords.join(', ')}\n` : ''}Content: ${bodyMd.substring(0, 2000)}...`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' }, temperature: 0.3,
    });
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      summary: result.summary || '', outline: result.outline || [],
      keywordsSuggested: result.keywordsSuggested || [], wordCount,
      readabilityScore: result.readabilityScore || 50, seoScore: result.seoScore || 0.5,
    };
  } catch (error) {
    return { summary: '', outline: [], keywordsSuggested: [], wordCount, readabilityScore: 50, seoScore: 0.5 };
  }
}

// =====================================================
// MAPPERS
// =====================================================

function mapKeywordClusterFromDb(data: any): KeywordCluster {
  return {
    id: data.id, name: data.name, description: data.description,
    clusterKeywords: data.cluster_keywords || [], primaryKeyword: data.primary_keyword,
    searchVolume: data.search_volume, difficultyScore: data.difficulty_score,
    recommendedTopics: data.recommended_topics || [], contentGaps: data.content_gaps || [],
    avgCpc: data.avg_cpc, competitionLevel: data.competition_level,
    trendDirection: data.trend_direction, organizationId: data.organization_id,
    createdBy: data.created_by, updatedBy: data.updated_by,
    createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapContentItemFromDb(data: any): ContentItemNew {
  return {
    id: data.id, title: data.title, slug: data.slug, excerpt: data.excerpt,
    bodyMd: data.body_md, bodyHtml: data.body_html, status: data.status, format: data.format,
    scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : null,
    publishedAt: data.published_at ? new Date(data.published_at) : null,
    metaTitle: data.meta_title, metaDescription: data.meta_description, keywords: data.keywords || [],
    seoScore: data.seo_score, readabilityScore: data.readability_score, wordCount: data.word_count,
    keywordClusterId: data.keyword_cluster_id, strategyId: data.strategy_id,
    aiSummary: data.ai_summary, aiOutline: data.ai_outline || [], aiKeywordsSuggested: data.ai_keywords_suggested || [],
    featuredImageUrl: data.featured_image_url, attachments: data.attachments || [],
    targetAudience: data.target_audience, buyerStage: data.buyer_stage,
    distributionChannels: data.distribution_channels || [], canonicalUrl: data.canonical_url,
    views: data.views, shares: data.shares, engagementScore: data.engagement_score,
    organizationId: data.organization_id, teamId: data.team_id, assignedTo: data.assigned_to,
    createdBy: data.created_by, updatedBy: data.updated_by,
    createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapContentCalendarFromDb(data: any): ContentCalendar {
  return {
    id: data.id, month: data.month, year: data.year, contentItemIds: data.content_item_ids || [],
    theme: data.theme, goals: data.goals, notes: data.notes,
    plannedItemsCount: data.planned_items_count, completedItemsCount: data.completed_items_count,
    completionRate: data.completion_rate, organizationId: data.organization_id,
    createdBy: data.created_by, updatedBy: data.updated_by,
    createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapSEOAuditFromDb(data: any): SEOAudit {
  return {
    id: data.id, url: data.url, title: data.title, auditScore: data.audit_score,
    performanceScore: data.performance_score, seoScore: data.seo_score,
    accessibilityScore: data.accessibility_score, bestPracticesScore: data.best_practices_score,
    issues: data.issues || [], suggestions: data.suggestions || [],
    metaData: data.meta_data || {}, headings: data.headings || {},
    imagesAnalyzed: data.images_analyzed, linksAnalyzed: data.links_analyzed,
    pageLoadTimeMs: data.page_load_time_ms, pageSizeKb: data.page_size_kb,
    totalRequests: data.total_requests, primaryKeywords: data.primary_keywords || [],
    keywordDensity: data.keyword_density || {}, missingKeywords: data.missing_keywords || [],
    wordCount: data.word_count, readabilityScore: data.readability_score,
    contentQualityScore: data.content_quality_score, backlinksCount: data.backlinks_count,
    domainAuthority: data.domain_authority, pageAuthority: data.page_authority,
    mobileFriendly: data.mobile_friendly, mobileIssues: data.mobile_issues || [],
    auditType: data.audit_type, auditedAt: new Date(data.audited_at),
    contentItemId: data.content_item_id, organizationId: data.organization_id,
    createdBy: data.created_by, createdAt: new Date(data.created_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapContentTaskFromDb(data: any): ContentTask {
  return {
    id: data.id, title: data.title, description: data.description, type: data.type,
    status: data.status, priority: data.priority,
    dueDate: data.due_date ? new Date(data.due_date) : null,
    completedAt: data.completed_at ? new Date(data.completed_at) : null,
    assignedTo: data.assigned_to, contentItemId: data.content_item_id,
    notes: data.notes, attachments: data.attachments || [],
    estimatedHours: data.estimated_hours, actualHours: data.actual_hours,
    organizationId: data.organization_id, createdBy: data.created_by,
    updatedBy: data.updated_by, createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}
