// =====================================================
// DOCUMENT WRITER TOOL
// =====================================================
// Generate formatted documents and save to database

import { AgentTool, AgentContext } from '@pravado/types';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

// =====================================================
// CREATE PRESS RELEASE
// =====================================================

export const createPressReleaseTool: AgentTool = {
  name: 'create-press-release',
  description: 'Create a new press release from generated content',
  inputSchema: {
    campaignId: { type: 'string', description: 'Campaign ID' },
    title: { type: 'string', description: 'Release title' },
    subtitle: { type: 'string', optional: true, description: 'Release subtitle' },
    bodyMd: { type: 'string', description: 'Release body in markdown' },
    embargoDate: { type: 'string', optional: true, description: 'Embargo date (ISO 8601)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DocumentWriter] Creating press release: ${input.title}`);

    const { data, error } = await supabase
      .from('press_releases')
      .insert({
        campaign_id: input.campaignId,
        title: input.title,
        subtitle: input.subtitle,
        body_md: input.bodyMd,
        embargo_date: input.embargoDate,
        status: 'DRAFT',
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      logger.error(`[DocumentWriter] Error creating press release: ${error.message}`);
      return { error: error.message };
    }

    logger.info(`[DocumentWriter] Created press release: ${data.id}`);
    return { pressRelease: data };
  },
};

// =====================================================
// CREATE CONTENT ITEM
// =====================================================

export const createContentItemTool: AgentTool = {
  name: 'create-content-item',
  description: 'Create a new content item from generated idea',
  inputSchema: {
    title: { type: 'string', description: 'Content title' },
    slug: { type: 'string', optional: true, description: 'URL slug' },
    excerpt: { type: 'string', optional: true, description: 'Short excerpt' },
    bodyMd: { type: 'string', optional: true, description: 'Content body in markdown' },
    format: { type: 'string', description: 'Content format (BLOG, VIDEO, etc.)' },
    keywords: { type: 'array', optional: true, description: 'SEO keywords' },
    metaDescription: { type: 'string', optional: true, description: 'Meta description' },
    publishDate: { type: 'string', optional: true, description: 'Publish date (ISO 8601)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DocumentWriter] Creating content item: ${input.title}`);

    const { data, error } = await supabase
      .from('content_items')
      .insert({
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        body_md: input.bodyMd,
        format: input.format,
        keywords: input.keywords,
        meta_description: input.metaDescription,
        publish_date: input.publishDate,
        status: 'DRAFT',
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      logger.error(`[DocumentWriter] Error creating content item: ${error.message}`);
      return { error: error.message };
    }

    logger.info(`[DocumentWriter] Created content item: ${data.id}`);
    return { contentItem: data };
  },
};

// =====================================================
// CREATE CAMPAIGN
// =====================================================

export const createCampaignTool: AgentTool = {
  name: 'create-campaign',
  description: 'Create a new PR campaign',
  inputSchema: {
    name: { type: 'string', description: 'Campaign name' },
    description: { type: 'string', optional: true, description: 'Campaign description' },
    objectives: { type: 'array', optional: true, description: 'Campaign objectives' },
    targetAudience: { type: 'string', optional: true, description: 'Target audience' },
    startDate: { type: 'string', optional: true, description: 'Start date (ISO 8601)' },
    endDate: { type: 'string', optional: true, description: 'End date (ISO 8601)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DocumentWriter] Creating campaign: ${input.name}`);

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: input.name,
        description: input.description,
        objectives: input.objectives,
        target_audience: input.targetAudience,
        start_date: input.startDate,
        end_date: input.endDate,
        status: 'PLANNED',
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      logger.error(`[DocumentWriter] Error creating campaign: ${error.message}`);
      return { error: error.message };
    }

    logger.info(`[DocumentWriter] Created campaign: ${data.id}`);
    return { campaign: data };
  },
};

// =====================================================
// CREATE KEYWORD CLUSTER
// =====================================================

export const createKeywordClusterTool: AgentTool = {
  name: 'create-keyword-cluster',
  description: 'Create a new keyword cluster for SEO',
  inputSchema: {
    primaryKeyword: { type: 'string', description: 'Primary keyword' },
    clusterKeywords: { type: 'array', description: 'Related keywords' },
    searchVolume: { type: 'number', optional: true, description: 'Monthly search volume' },
    keywordDifficulty: { type: 'number', optional: true, description: 'Difficulty score (0-100)' },
    recommendedTopics: { type: 'array', optional: true, description: 'Topic suggestions' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DocumentWriter] Creating keyword cluster: ${input.primaryKeyword}`);

    const { data, error } = await supabase
      .from('keyword_clusters')
      .insert({
        primary_keyword: input.primaryKeyword,
        cluster_keywords: input.clusterKeywords,
        search_volume: input.searchVolume,
        keyword_difficulty: input.keywordDifficulty,
        recommended_topics: input.recommendedTopics,
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) {
      logger.error(`[DocumentWriter] Error creating keyword cluster: ${error.message}`);
      return { error: error.message };
    }

    logger.info(`[DocumentWriter] Created keyword cluster: ${data.id}`);
    return { keywordCluster: data };
  },
};

// =====================================================
// UPDATE DOCUMENT
// =====================================================

export const updateDocumentTool: AgentTool = {
  name: 'update-document',
  description: 'Update an existing document (press release or content item)',
  inputSchema: {
    table: { type: 'string', description: 'Table name (press_releases or content_items)' },
    id: { type: 'string', description: 'Document ID' },
    updates: { type: 'object', description: 'Fields to update' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DocumentWriter] Updating ${input.table}: ${input.id}`);

    const { data, error } = await supabase
      .from(input.table)
      .update({
        ...input.updates,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq('id', input.id)
      .eq('organization_id', context.organizationId)
      .select()
      .single();

    if (error) {
      logger.error(`[DocumentWriter] Error updating document: ${error.message}`);
      return { error: error.message };
    }

    logger.info(`[DocumentWriter] Updated ${input.table}: ${data.id}`);
    return { document: data };
  },
};

// =====================================================
// EXPORT ALL TOOLS
// =====================================================

export const documentWriterTools: AgentTool[] = [
  createPressReleaseTool,
  createContentItemTool,
  createCampaignTool,
  createKeywordClusterTool,
  updateDocumentTool,
];
