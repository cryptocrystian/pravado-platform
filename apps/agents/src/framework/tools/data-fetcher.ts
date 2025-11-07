// =====================================================
// DATA FETCHER TOOL
// =====================================================
// Fetch strategy, contacts, clusters from database

import { AgentTool, AgentContext } from '@pravado/types';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

// =====================================================
// FETCH STRATEGY
// =====================================================

export const fetchStrategyTool: AgentTool = {
  name: 'fetch-strategy',
  description: 'Fetch the current strategy plan for the organization',
  inputSchema: {},
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DataFetcher] Fetching strategy for org: ${context.organizationId}`);

    const { data, error } = await supabase
      .from('strategy_plans')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('is_current', true)
      .single();

    if (error) {
      logger.error(`[DataFetcher] Error fetching strategy: ${error.message}`);
      return { error: error.message };
    }

    return { strategy: data };
  },
};

// =====================================================
// FETCH CONTACTS
// =====================================================

export const fetchContactsTool: AgentTool = {
  name: 'fetch-contacts',
  description: 'Fetch contacts filtered by tier, topics, or regions',
  inputSchema: {
    tier: { type: 'string', optional: true, description: 'Filter by tier (TIER_1, TIER_2, TIER_3)' },
    topics: { type: 'array', optional: true, description: 'Filter by topics' },
    regions: { type: 'array', optional: true, description: 'Filter by regions' },
    limit: { type: 'number', optional: true, description: 'Max contacts to return (default 100)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DataFetcher] Fetching contacts for org: ${context.organizationId}`);

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (input.tier) {
      query = query.eq('tier', input.tier);
    }

    if (input.topics && input.topics.length > 0) {
      query = query.contains('topics', input.topics);
    }

    if (input.regions && input.regions.length > 0) {
      query = query.contains('regions', input.regions);
    }

    query = query.limit(input.limit || 100);

    const { data, error } = await query;

    if (error) {
      logger.error(`[DataFetcher] Error fetching contacts: ${error.message}`);
      return { error: error.message };
    }

    return { contacts: data, count: data.length };
  },
};

// =====================================================
// FETCH KEYWORD CLUSTERS
// =====================================================

export const fetchKeywordClustersTool: AgentTool = {
  name: 'fetch-keyword-clusters',
  description: 'Fetch keyword clusters for SEO and content planning',
  inputSchema: {
    minSearchVolume: { type: 'number', optional: true, description: 'Minimum search volume' },
    maxDifficulty: { type: 'number', optional: true, description: 'Maximum keyword difficulty' },
    limit: { type: 'number', optional: true, description: 'Max clusters to return (default 50)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DataFetcher] Fetching keyword clusters for org: ${context.organizationId}`);

    let query = supabase
      .from('keyword_clusters')
      .select('*')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (input.minSearchVolume) {
      query = query.gte('search_volume', input.minSearchVolume);
    }

    if (input.maxDifficulty) {
      query = query.lte('keyword_difficulty', input.maxDifficulty);
    }

    query = query.limit(input.limit || 50);

    const { data, error } = await query;

    if (error) {
      logger.error(`[DataFetcher] Error fetching clusters: ${error.message}`);
      return { error: error.message };
    }

    return { clusters: data, count: data.length };
  },
};

// =====================================================
// FETCH CAMPAIGNS
// =====================================================

export const fetchCampaignsTool: AgentTool = {
  name: 'fetch-campaigns',
  description: 'Fetch PR campaigns by status',
  inputSchema: {
    status: { type: 'string', optional: true, description: 'Filter by status' },
    limit: { type: 'number', optional: true, description: 'Max campaigns to return (default 20)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DataFetcher] Fetching campaigns for org: ${context.organizationId}`);

    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (input.status) {
      query = query.eq('status', input.status);
    }

    query = query.limit(input.limit || 20);

    const { data, error } = await query;

    if (error) {
      logger.error(`[DataFetcher] Error fetching campaigns: ${error.message}`);
      return { error: error.message };
    }

    return { campaigns: data, count: data.length };
  },
};

// =====================================================
// FETCH CONTENT ITEMS
// =====================================================

export const fetchContentItemsTool: AgentTool = {
  name: 'fetch-content-items',
  description: 'Fetch content items by format and status',
  inputSchema: {
    format: { type: 'string', optional: true, description: 'Filter by format' },
    status: { type: 'string', optional: true, description: 'Filter by status' },
    limit: { type: 'number', optional: true, description: 'Max items to return (default 50)' },
  },
  execute: async (input: any, context: AgentContext) => {
    logger.info(`[DataFetcher] Fetching content items for org: ${context.organizationId}`);

    let query = supabase
      .from('content_items')
      .select('*')
      .eq('organization_id', context.organizationId)
      .is('deleted_at', null);

    if (input.format) {
      query = query.eq('format', input.format);
    }

    if (input.status) {
      query = query.eq('status', input.status);
    }

    query = query.limit(input.limit || 50);

    const { data, error } = await query;

    if (error) {
      logger.error(`[DataFetcher] Error fetching content items: ${error.message}`);
      return { error: error.message };
    }

    return { contentItems: data, count: data.length };
  },
};

// =====================================================
// EXPORT ALL TOOLS
// =====================================================

export const dataFetcherTools: AgentTool[] = [
  fetchStrategyTool,
  fetchContactsTool,
  fetchKeywordClustersTool,
  fetchCampaignsTool,
  fetchContentItemsTool,
];
