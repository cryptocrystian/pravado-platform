// =====================================================
// AIOPS EXPLAINABILITY SERVICE
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// API layer for accessing decision logs and explainability

import {
  getDecisionLogs,
  getLatestDecision,
  getDecisionStats,
  getProviderPerformance,
  explainDecision,
  exportDecisionLogs,
  DecisionLog,
} from '@pravado/utils/llm/strategy/explainLogger';
import { logger } from '../lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface DecisionHistoryQuery {
  organizationId: string;
  limit?: number;
  taskCategory?: string;
  provider?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DecisionSummary {
  organizationId: string;
  period: '1h' | '24h' | '7d' | '30d' | 'all';
  totalDecisions: number;
  byProvider: Record<string, number>;
  byTaskCategory: Record<string, number>;
  avgCost: number;
  forceCheapestCount: number;
  forceCheapestPercentage: number;
  topProviders: Array<{
    provider: string;
    model: string;
    timesSelected: number;
    avgCost: number;
    avgScore: number;
  }>;
}

export interface ExplainabilityReport {
  decision: DecisionLog;
  explanation: string;
  insights: {
    primaryFactor: 'cost' | 'latency' | 'error' | 'quality';
    costEfficiency: 'optimal' | 'good' | 'poor';
    alternativesConsidered: number;
    modelsFiltered: number;
    budgetConstrained: boolean;
  };
}

// =====================================================
// DECISION HISTORY
// =====================================================

/**
 * Get decision history for an organization
 */
export async function getDecisionHistory(
  query: DecisionHistoryQuery
): Promise<DecisionLog[]> {
  try {
    const { organizationId, limit, taskCategory, provider, startDate, endDate } = query;

    logger.info('[AIOpsExplain] Fetching decision history', {
      organizationId,
      limit,
      taskCategory,
      provider,
    });

    const logs = getDecisionLogs(organizationId, {
      limit,
      taskCategory,
      provider,
      startDate,
      endDate,
    });

    return logs;
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to get decision history', error);
    throw error;
  }
}

/**
 * Get latest decision for an organization
 */
export async function getLatestDecisionForOrg(
  organizationId: string
): Promise<DecisionLog | null> {
  try {
    logger.debug('[AIOpsExplain] Fetching latest decision', { organizationId });

    const decision = getLatestDecision(organizationId);

    return decision;
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to get latest decision', error);
    throw error;
  }
}

/**
 * Get decision by ID (searches recent logs)
 */
export async function getDecisionById(
  organizationId: string,
  decisionId: string
): Promise<DecisionLog | null> {
  try {
    const logs = getDecisionLogs(organizationId);

    const decision = logs.find((log) => log.id === decisionId);

    return decision || null;
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to get decision by ID', error);
    throw error;
  }
}

// =====================================================
// DECISION ANALYTICS
// =====================================================

/**
 * Get decision summary for an organization
 */
export async function getDecisionSummary(
  organizationId: string,
  period: '1h' | '24h' | '7d' | '30d' | 'all' = '24h'
): Promise<DecisionSummary> {
  try {
    logger.info('[AIOpsExplain] Generating decision summary', { organizationId, period });

    // Calculate time range
    const endDate = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = undefined;
        break;
    }

    // Get stats
    const stats = getDecisionStats(organizationId);
    const performance = getProviderPerformance(organizationId);

    // Filter by time period if needed
    let logs = getDecisionLogs(organizationId);
    if (startDate) {
      logs = logs.filter((log) => log.timestamp >= startDate);
    }

    // Calculate period-specific stats
    const periodStats = calculatePeriodStats(logs);

    return {
      organizationId,
      period,
      totalDecisions: periodStats.totalDecisions,
      byProvider: periodStats.byProvider,
      byTaskCategory: periodStats.byTaskCategory,
      avgCost: periodStats.avgCost,
      forceCheapestCount: periodStats.forceCheapestCount,
      forceCheapestPercentage:
        periodStats.totalDecisions > 0
          ? (periodStats.forceCheapestCount / periodStats.totalDecisions) * 100
          : 0,
      topProviders: performance.slice(0, 5), // Top 5 providers
    };
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to get decision summary', error);
    throw error;
  }
}

/**
 * Calculate stats for a set of decision logs
 */
function calculatePeriodStats(logs: DecisionLog[]): {
  totalDecisions: number;
  byProvider: Record<string, number>;
  byTaskCategory: Record<string, number>;
  avgCost: number;
  forceCheapestCount: number;
} {
  const byProvider: Record<string, number> = {};
  const byTaskCategory: Record<string, number> = {};
  let totalCost = 0;
  let forceCheapestCount = 0;

  for (const log of logs) {
    // Provider stats
    const providerKey = `${log.selectedProvider}:${log.selectedModel}`;
    byProvider[providerKey] = (byProvider[providerKey] || 0) + 1;

    // Task category stats
    byTaskCategory[log.taskCategory] = (byTaskCategory[log.taskCategory] || 0) + 1;

    // Cost stats
    totalCost += log.estimatedCost;

    // Force cheapest count
    if (log.constraints.forceCheapest) {
      forceCheapestCount++;
    }
  }

  return {
    totalDecisions: logs.length,
    byProvider,
    byTaskCategory,
    avgCost: logs.length > 0 ? totalCost / logs.length : 0,
    forceCheapestCount,
  };
}

// =====================================================
// EXPLAINABILITY
// =====================================================

/**
 * Get detailed explanation for a decision
 */
export async function explainDecisionById(
  organizationId: string,
  decisionId: string
): Promise<ExplainabilityReport | null> {
  try {
    logger.info('[AIOpsExplain] Generating explainability report', {
      organizationId,
      decisionId,
    });

    const decision = await getDecisionById(organizationId, decisionId);

    if (!decision) {
      return null;
    }

    // Generate explanation
    const explanation = explainDecision(decision);

    // Analyze decision insights
    const insights = analyzeDecisionInsights(decision);

    return {
      decision,
      explanation,
      insights,
    };
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to explain decision', error);
    throw error;
  }
}

/**
 * Get explanation for latest decision
 */
export async function explainLatestDecision(
  organizationId: string
): Promise<ExplainabilityReport | null> {
  try {
    const decision = await getLatestDecisionForOrg(organizationId);

    if (!decision) {
      return null;
    }

    const explanation = explainDecision(decision);
    const insights = analyzeDecisionInsights(decision);

    return {
      decision,
      explanation,
      insights,
    };
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to explain latest decision', error);
    throw error;
  }
}

/**
 * Analyze decision to extract insights
 */
function analyzeDecisionInsights(decision: DecisionLog): ExplainabilityReport['insights'] {
  const { factors, alternatives, constraints } = decision;

  // Determine primary factor
  let primaryFactor: 'cost' | 'latency' | 'error' | 'quality' = 'cost';
  let maxScore = factors.costScore;

  if (factors.latencyScore > maxScore) {
    primaryFactor = 'latency';
    maxScore = factors.latencyScore;
  }

  if (factors.errorScore > maxScore) {
    primaryFactor = 'error';
    maxScore = factors.errorScore;
  }

  if (factors.qualityScore > maxScore) {
    primaryFactor = 'quality';
  }

  // Determine cost efficiency
  let costEfficiency: 'optimal' | 'good' | 'poor' = 'optimal';

  // If there are alternatives with similar score but lower cost, efficiency is poor
  const similarAlternatives = alternatives.filter(
    (alt) => !alt.rejected && Math.abs(alt.score - factors.totalScore) < 0.1
  );

  if (similarAlternatives.length > 0) {
    costEfficiency = 'good';
  }

  // If forced cheapest, efficiency is optimal (maximizing budget)
  if (constraints.forceCheapest) {
    costEfficiency = 'optimal';
  }

  // Count alternatives and filtered models
  const alternativesConsidered = alternatives.filter((alt) => !alt.rejected).length;
  const modelsFiltered = alternatives.filter((alt) => alt.rejected).length;

  return {
    primaryFactor,
    costEfficiency,
    alternativesConsidered,
    modelsFiltered,
    budgetConstrained: constraints.forceCheapest,
  };
}

// =====================================================
// EXPORT & REPORTING
// =====================================================

/**
 * Export decision logs for analysis
 */
export async function exportDecisions(organizationId: string): Promise<{
  organizationId: string;
  exportDate: Date;
  totalLogs: number;
  logs: DecisionLog[];
  stats: ReturnType<typeof getDecisionStats>;
}> {
  try {
    logger.info('[AIOpsExplain] Exporting decision logs', { organizationId });

    const exportData = exportDecisionLogs(organizationId);

    return exportData;
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to export decisions', error);
    throw error;
  }
}

/**
 * Get trending decisions (most common selections)
 */
export async function getTrendingDecisions(
  organizationId: string,
  limit: number = 5
): Promise<Array<{
  provider: string;
  model: string;
  count: number;
  avgCost: number;
  lastUsed: Date;
}>> {
  try {
    const logs = getDecisionLogs(organizationId);

    const modelCounts = new Map<
      string,
      { count: number; totalCost: number; lastUsed: Date }
    >();

    for (const log of logs) {
      const key = `${log.selectedProvider}:${log.selectedModel}`;
      const existing = modelCounts.get(key) || {
        count: 0,
        totalCost: 0,
        lastUsed: log.timestamp,
      };

      existing.count++;
      existing.totalCost += log.estimatedCost;

      if (log.timestamp > existing.lastUsed) {
        existing.lastUsed = log.timestamp;
      }

      modelCounts.set(key, existing);
    }

    // Convert to array and sort by count
    const trending = Array.from(modelCounts.entries())
      .map(([key, stats]) => {
        const [provider, model] = key.split(':');
        return {
          provider,
          model,
          count: stats.count,
          avgCost: stats.totalCost / stats.count,
          lastUsed: stats.lastUsed,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return trending;
  } catch (error) {
    logger.error('[AIOpsExplain] Failed to get trending decisions', error);
    throw error;
  }
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Check if explainability is enabled
 */
export function isExplainabilityEnabled(): boolean {
  return process.env.ENABLE_LLM_EXPLAINABILITY === 'true';
}

/**
 * Get explainability configuration
 */
export function getExplainabilityConfig(): {
  enabled: boolean;
  maxLogsPerOrg: number;
} {
  return {
    enabled: isExplainabilityEnabled(),
    maxLogsPerOrg: 100, // From explainLogger circular buffer
  };
}
