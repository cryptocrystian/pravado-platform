// =====================================================
// PR OPPORTUNITIES SERVICE
// Sprint 68 Track B
// =====================================================
// Service layer for media opportunity scanning and management

import { supabase } from '../lib/supabase';
import { mediaOpportunityAgent } from '../../../agents/src/agents/pr/media-opportunity.agent';

export interface MediaOpportunity {
  id: string;
  organizationId: string;
  newsItemId: string;
  title: string;
  source: string;
  url: string;
  publishedAt: Date;
  opportunityScore: number;
  relevanceScore: number;
  visibilityScore: number;
  freshnessScore: number;
  matchReasons: string[];
  keywords: string[];
  status: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface ListOpportunitiesFilters {
  status?: string;
  minScore?: number;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface ScanOpportunitiesInput {
  organizationId: string;
  focusKeywords?: string[];
  minScore?: number;
}

export interface ScanResult {
  scannedItems: number;
  opportunitiesFound: number;
  opportunities: MediaOpportunity[];
  scanDuration: number;
}

// =====================================================
// SCAN OPERATIONS
// =====================================================

/**
 * Trigger a manual scan for media opportunities
 */
export async function scanForOpportunities(
  input: ScanOpportunitiesInput
): Promise<ScanResult> {
  const { organizationId, focusKeywords = [], minScore = 50 } = input;

  // Call the media opportunity agent to scan news feed
  const result = await mediaOpportunityAgent.scanForOpportunities(
    organizationId,
    focusKeywords,
    minScore
  );

  // Save opportunities to database
  if (result.opportunities.length > 0) {
    await mediaOpportunityAgent.saveOpportunities(result.opportunities);
  }

  return {
    scannedItems: result.scannedItems,
    opportunitiesFound: result.opportunitiesFound,
    opportunities: result.opportunities.map(mapOpportunityToResponse),
    scanDuration: result.scanDuration,
  };
}

// =====================================================
// QUERY OPERATIONS
// =====================================================

/**
 * List media opportunities with filtering and pagination
 */
export async function listOpportunities(
  organizationId: string,
  filters: ListOpportunitiesFilters = {}
): Promise<MediaOpportunity[]> {
  const {
    status,
    minScore,
    source,
    limit = 50,
    offset = 0,
  } = filters;

  let query = supabase
    .from('media_opportunities')
    .select('*')
    .eq('organization_id', organizationId)
    .order('opportunity_score', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (minScore !== undefined) {
    query = query.gte('opportunity_score', minScore);
  }

  if (source) {
    query = query.eq('source', source);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list opportunities: ${error.message}`);
  }

  return (data || []).map(mapOpportunityFromDb);
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunityById(
  opportunityId: string,
  organizationId: string
): Promise<MediaOpportunity | null> {
  const { data, error } = await supabase
    .from('media_opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get opportunity: ${error.message}`);
  }

  return mapOpportunityFromDb(data);
}

/**
 * Update opportunity status (e.g., mark as reviewed, added to campaign)
 */
export async function updateOpportunityStatus(
  opportunityId: string,
  organizationId: string,
  status: 'NEW' | 'REVIEWED' | 'ADDED_TO_CAMPAIGN' | 'DISMISSED'
): Promise<MediaOpportunity> {
  const { data, error } = await supabase
    .from('media_opportunities')
    .update({ status })
    .eq('id', opportunityId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update opportunity status: ${error.message}`);
  }

  return mapOpportunityFromDb(data);
}

/**
 * Get opportunity statistics for dashboard
 */
export async function getOpportunityStats(
  organizationId: string
): Promise<{
  total: number;
  new: number;
  reviewed: number;
  addedToCampaign: number;
  averageScore: number;
}> {
  const { data, error } = await supabase
    .from('media_opportunities')
    .select('status, opportunity_score')
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to get opportunity stats: ${error.message}`);
  }

  const stats = {
    total: data.length,
    new: data.filter((o) => o.status === 'NEW').length,
    reviewed: data.filter((o) => o.status === 'REVIEWED').length,
    addedToCampaign: data.filter((o) => o.status === 'ADDED_TO_CAMPAIGN').length,
    averageScore: data.length > 0
      ? data.reduce((sum, o) => sum + o.opportunity_score, 0) / data.length
      : 0,
  };

  return stats;
}

// =====================================================
// MAPPERS
// =====================================================

function mapOpportunityFromDb(dbRecord: any): MediaOpportunity {
  return {
    id: dbRecord.id,
    organizationId: dbRecord.organization_id,
    newsItemId: dbRecord.news_item_id,
    title: dbRecord.title,
    source: dbRecord.source,
    url: dbRecord.url,
    publishedAt: new Date(dbRecord.published_at),
    opportunityScore: dbRecord.opportunity_score,
    relevanceScore: dbRecord.relevance_score,
    visibilityScore: dbRecord.visibility_score,
    freshnessScore: dbRecord.freshness_score,
    matchReasons: dbRecord.match_reasons || [],
    keywords: dbRecord.keywords || [],
    status: dbRecord.status,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}

function mapOpportunityToResponse(opportunity: any): MediaOpportunity {
  return {
    id: opportunity.id || '',
    organizationId: opportunity.organizationId,
    newsItemId: opportunity.newsItemId,
    title: opportunity.title,
    source: opportunity.source,
    url: opportunity.url,
    publishedAt: opportunity.publishedAt,
    opportunityScore: opportunity.opportunityScore,
    relevanceScore: opportunity.relevanceScore,
    visibilityScore: opportunity.visibilityScore,
    freshnessScore: opportunity.freshnessScore,
    matchReasons: opportunity.matchReasons,
    keywords: opportunity.keywords,
    status: opportunity.status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
