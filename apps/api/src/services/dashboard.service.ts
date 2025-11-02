// =====================================================
// DASHBOARD SERVICE
// =====================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  DashboardMetrics,
  DashboardFilters,
  ReportSnapshot,
  CreateReportSnapshotInput,
  StrategyScorecard,
  ScorecardCategory,
  PerformanceTrends,
  MetricTrend,
} from '@pravado/shared-types';

// =====================================================
// DASHBOARD METRICS
// =====================================================

export async function getStrategyDashboardMetrics(
  organizationId: string,
  filters: DashboardFilters
): Promise<DashboardMetrics> {
  logger.info(`[DashboardService] Getting metrics for org: ${organizationId}`);

  const { startDate, endDate } = filters;

  // Get strategy summary from database function
  const { data: summaryData, error: summaryError } = await supabase.rpc('get_strategy_summary', {
    org_uuid: organizationId,
    start_date: startDate,
    end_date: endDate,
  });

  if (summaryError) {
    logger.error(`[DashboardService] Error getting summary: ${summaryError.message}`);
    throw new Error(`Failed to get summary: ${summaryError.message}`);
  }

  const summary = summaryData[0] || {
    campaigns: {},
    content: {},
    contacts: {},
    agents: {},
  };

  // Get performance metrics
  const { data: performanceData, error: performanceError } = await supabase.rpc(
    'get_org_performance_metrics',
    {
      org_uuid: organizationId,
    }
  );

  if (performanceError) {
    logger.error(`[DashboardService] Error getting performance: ${performanceError.message}`);
  }

  const performanceMetrics = performanceData || [];

  // Get trends
  const trends = await getPerformanceTrends(organizationId, startDate, endDate);

  // Get coverage heatmap
  const coverage = await getCoverageHeatmap(organizationId);

  // Get latest scorecard
  const scorecard = await getLatestScorecard(organizationId);

  return {
    summary,
    performanceMetrics,
    trends,
    coverage,
    scorecard,
    period: {
      startDate,
      endDate,
    },
  };
}

// =====================================================
// PERFORMANCE TRENDS
// =====================================================

async function getPerformanceTrends(
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<PerformanceTrends> {
  // Pitch Volume Trend
  const { data: pitchData } = await supabase
    .from('pitch_workflows')
    .select('created_at, sent_count')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  const pitchVolume: MetricTrend[] = aggregateByDate(pitchData || [], 'created_at', 'sent_count');

  // Open Rate Trend
  const { data: openRateData } = await supabase
    .from('pitch_workflows')
    .select('created_at, opened_count, delivered_count')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  const openRate: MetricTrend[] = (openRateData || []).map((row: any) => ({
    date: row.created_at.split('T')[0],
    value: row.delivered_count > 0 ? (row.opened_count / row.delivered_count) * 100 : 0,
  }));

  // Content Output Trend
  const { data: contentData } = await supabase
    .from('content_items')
    .select('created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  const contentOutput: MetricTrend[] = aggregateCountByDate(contentData || [], 'created_at');

  // SEO Score Trend
  const { data: seoData } = await supabase
    .from('content_items')
    .select('created_at, seo_score')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('seo_score', 'is', null)
    .order('created_at', { ascending: true });

  const seoScore: MetricTrend[] = (seoData || []).map((row: any) => ({
    date: row.created_at.split('T')[0],
    value: row.seo_score || 0,
  }));

  return {
    pitchVolume,
    openRate,
    contentOutput,
    seoScore,
  };
}

// =====================================================
// COVERAGE HEATMAP
// =====================================================

async function getCoverageHeatmap(organizationId: string) {
  // Tier coverage
  const { data: tierData } = await supabase
    .from('contacts')
    .select('tier')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  const totalContacts = tierData?.length || 0;
  const tierCounts: Record<string, number> = {
    TIER_1: 0,
    TIER_2: 0,
    TIER_3: 0,
  };

  tierData?.forEach((row: any) => {
    if (tierCounts[row.tier] !== undefined) {
      tierCounts[row.tier]++;
    }
  });

  const tierCoverage = Object.entries(tierCounts).map(([tier, count]) => ({
    tier: tier as any,
    count,
    percentage: totalContacts > 0 ? (count / totalContacts) * 100 : 0,
  }));

  // Topic coverage
  const { data: topicData } = await supabase
    .from('contacts')
    .select('topics')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  const topicCounts: Record<string, number> = {};
  topicData?.forEach((row: any) => {
    if (row.topics && Array.isArray(row.topics)) {
      row.topics.forEach((topic: string) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });

  const topicCoverage = Object.entries(topicCounts)
    .map(([topic, contactCount]) => ({
      topic,
      contactCount,
      pitchCount: 0, // TODO: Calculate pitch count per topic
      coverageRate: 0,
    }))
    .sort((a, b) => b.contactCount - a.contactCount)
    .slice(0, 10);

  // Outlet types
  const { data: outletData } = await supabase
    .from('contacts')
    .select('outlet_type')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .not('outlet_type', 'is', null);

  const outletCounts: Record<string, number> = {};
  outletData?.forEach((row: any) => {
    outletCounts[row.outlet_type] = (outletCounts[row.outlet_type] || 0) + 1;
  });

  const outletTypes = Object.entries(outletCounts).map(([type, count]) => ({
    type,
    count,
  }));

  return {
    tierCoverage,
    topicCoverage,
    outletTypes,
  };
}

// =====================================================
// SCORECARDS
// =====================================================

async function getLatestScorecard(organizationId: string): Promise<StrategyScorecard | null> {
  const { data, error } = await supabase
    .from('strategy_scorecards')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToStrategyScorecard(data);
}

export async function calculateStrategyScorecard(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  category: ScorecardCategory
): Promise<StrategyScorecard> {
  logger.info(`[DashboardService] Calculating scorecard for org: ${organizationId}`);

  // Get metrics for period
  const { data: summaryData } = await supabase.rpc('get_strategy_summary', {
    org_uuid: organizationId,
    start_date: periodStart.toISOString().split('T')[0],
    end_date: periodEnd.toISOString().split('T')[0],
  });

  const summary = summaryData[0] || {};

  // Calculate scores (0-100)
  const prScore = calculatePRScore(summary.campaigns);
  const contentScore = calculateContentScore(summary.content);
  const seoScore = summary.content?.avgSeoScore || 0;
  const reachScore = calculateReachScore(summary.contacts);
  const engagementScore = calculateEngagementScore(summary.campaigns);

  const overallScore = (prScore + contentScore + seoScore + reachScore + engagementScore) / 5;

  // Generate insights
  const strengths = generateStrengths(summary);
  const weaknesses = generateWeaknesses(summary);
  const recommendations = generateRecommendations(summary);

  // Create scorecard
  const { data, error } = await supabase
    .from('strategy_scorecards')
    .insert({
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      category,
      score: overallScore,
      pr_score: prScore,
      content_score: contentScore,
      seo_score: seoScore,
      reach_score: reachScore,
      engagement_score: engagementScore,
      metrics_data: summary,
      strengths,
      weaknesses,
      recommendations,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[DashboardService] Error creating scorecard: ${error.message}`);
    throw new Error(`Failed to create scorecard: ${error.message}`);
  }

  return mapToStrategyScorecard(data);
}

// =====================================================
// REPORT SNAPSHOTS
// =====================================================

export async function generateReportSnapshot(
  input: CreateReportSnapshotInput,
  userId: string
): Promise<ReportSnapshot> {
  logger.info(`[DashboardService] Generating report snapshot: ${input.name}`);

  // Get metrics for the period
  const metrics = await getStrategyDashboardMetrics(input.organizationId, {
    startDate: input.startDate.toISOString().split('T')[0],
    endDate: input.endDate.toISOString().split('T')[0],
    ...input.filters,
  });

  const { data, error } = await supabase
    .from('report_snapshots')
    .insert({
      name: input.name,
      description: input.description,
      report_type: input.reportType,
      format: input.format || 'JSON',
      start_date: input.startDate.toISOString().split('T')[0],
      end_date: input.endDate.toISOString().split('T')[0],
      filters: input.filters || {},
      metrics: {
        campaigns: metrics.summary.campaigns,
        content: metrics.summary.content,
        contacts: metrics.summary.contacts,
        agents: metrics.summary.agents,
      },
      generated_at: new Date().toISOString(),
      organization_id: input.organizationId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[DashboardService] Error creating snapshot: ${error.message}`);
    throw new Error(`Failed to create snapshot: ${error.message}`);
  }

  return mapToReportSnapshot(data);
}

export async function getReportSnapshots(organizationId: string): Promise<ReportSnapshot[]> {
  const { data, error } = await supabase
    .from('report_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(`[DashboardService] Error getting snapshots: ${error.message}`);
    throw new Error(`Failed to get snapshots: ${error.message}`);
  }

  return (data || []).map(mapToReportSnapshot);
}

// =====================================================
// SCORING HELPERS
// =====================================================

function calculatePRScore(campaigns: any): number {
  if (!campaigns || !campaigns.totalWorkflows) return 0;

  const completionRate = campaigns.completedWorkflows / campaigns.totalWorkflows;
  const openRate = campaigns.openRate / 100; // Convert percentage to decimal
  const replyRate = campaigns.replyRate / 100;

  return Math.min(100, (completionRate * 30 + openRate * 40 + replyRate * 30) * 100);
}

function calculateContentScore(content: any): number {
  if (!content || !content.totalItems) return 0;

  const publishRate = content.publishedItems / content.totalItems;
  const seoScore = content.avgSeoScore || 0;
  const readabilityScore = content.avgReadabilityScore || 50;

  return Math.min(100, publishRate * 40 + seoScore * 40 + (readabilityScore / 100) * 20);
}

function calculateReachScore(contacts: any): number {
  if (!contacts || !contacts.totalContacts) return 0;

  const tier1Ratio = contacts.tier1Count / contacts.totalContacts;
  const totalScore = Math.min(100, (tier1Ratio * 100 + contacts.totalContacts / 10));

  return totalScore;
}

function calculateEngagementScore(campaigns: any): number {
  if (!campaigns) return 0;

  const clickRate = campaigns.clickRate / 100;
  const replyRate = campaigns.replyRate / 100;

  return Math.min(100, (clickRate * 50 + replyRate * 50) * 100);
}

// =====================================================
// INSIGHT HELPERS
// =====================================================

function generateStrengths(summary: any): string[] {
  const strengths: string[] = [];

  if (summary.campaigns?.openRate > 30) {
    strengths.push('High pitch open rate indicating strong targeting');
  }

  if (summary.content?.avgSeoScore > 70) {
    strengths.push('Excellent SEO scores across content');
  }

  if (summary.contacts?.tier1Count > 50) {
    strengths.push('Strong tier-1 contact base');
  }

  if (summary.agents?.successfulExecutions / summary.agents?.totalExecutions > 0.9) {
    strengths.push('Highly reliable AI agent performance');
  }

  return strengths.length > 0 ? strengths : ['Building momentum'];
}

function generateWeaknesses(summary: any): string[] {
  const weaknesses: string[] = [];

  if (summary.campaigns?.replyRate < 5) {
    weaknesses.push('Low reply rate - consider pitch personalization improvements');
  }

  if (summary.content?.publishedItems / summary.content?.totalItems < 0.5) {
    weaknesses.push('Many draft items - focus on publishing pipeline');
  }

  if (summary.contacts?.totalContacts < 100) {
    weaknesses.push('Limited contact database - expand media relationships');
  }

  return weaknesses.length > 0 ? weaknesses : ['No major concerns identified'];
}

function generateRecommendations(summary: any): string[] {
  const recommendations: string[] = [];

  if (summary.campaigns?.replyRate < 10) {
    recommendations.push('Implement A/B testing on pitch subject lines');
  }

  if (summary.content?.avgSeoScore < 60) {
    recommendations.push('Use content agents more frequently for SEO optimization');
  }

  if (summary.contacts?.tier1Count < summary.contacts?.totalContacts * 0.2) {
    recommendations.push('Focus on cultivating tier-1 relationships');
  }

  return recommendations.length > 0 ? recommendations : ['Continue current strategy'];
}

// =====================================================
// AGGREGATION HELPERS
// =====================================================

function aggregateByDate(data: any[], dateField: string, valueField: string): MetricTrend[] {
  const grouped: Record<string, number> = {};

  data.forEach((row) => {
    const date = row[dateField].split('T')[0];
    grouped[date] = (grouped[date] || 0) + (row[valueField] || 0);
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}

function aggregateCountByDate(data: any[], dateField: string): MetricTrend[] {
  const grouped: Record<string, number> = {};

  data.forEach((row) => {
    const date = row[dateField].split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}

// =====================================================
// MAPPERS
// =====================================================

function mapToStrategyScorecard(data: any): StrategyScorecard {
  return {
    id: data.id,
    periodStart: new Date(data.period_start),
    periodEnd: new Date(data.period_end),
    category: data.category,
    score: data.score,
    prScore: data.pr_score,
    contentScore: data.content_score,
    seoScore: data.seo_score,
    reachScore: data.reach_score,
    engagementScore: data.engagement_score,
    metricsData: data.metrics_data,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    recommendations: data.recommendations,
    organizationId: data.organization_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapToReportSnapshot(data: any): ReportSnapshot {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    reportType: data.report_type,
    format: data.format,
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    filters: data.filters,
    metrics: data.metrics,
    exportUrl: data.export_url,
    fileSizeBytes: data.file_size_bytes,
    generatedAt: data.generated_at ? new Date(data.generated_at) : null,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
  };
}
