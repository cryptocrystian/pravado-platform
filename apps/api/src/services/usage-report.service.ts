// =====================================================
// USAGE REPORT SERVICE
// Sprint 71: User-Facing AI Performance Reports + Billing Integration
// =====================================================

import { getDailyUsageRecords, getUsageSummary, DailyUsage } from './billing-ledger.service';
import { getCacheMetrics } from '../middleware/llm-cache.middleware';
import { logger } from '../lib/logger';

export interface UsageReport {
  organizationId: string;
  period: { startDate: Date; endDate: Date };
  summary: {
    totalCost: number;
    totalRequests: number;
    avgDailyCost: number;
    cacheHitRate: number;
  };
  dailyBreakdown: DailyUsage[];
  providerMix: Record<string, { requests: number; cost: number; percentage: number }>;
  modelMix: Record<string, { requests: number; cost: number; percentage: number }>;
  taskCategoryMix: Record<string, { requests: number; cost: number }>;
  trends: {
    costTrend: 'increasing' | 'decreasing' | 'stable';
    requestTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export async function generateUsageReport(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageReport | null> {
  try {
    const summary = await getUsageSummary(organizationId, startDate, endDate);
    const dailyRecords = await getDailyUsageRecords(organizationId, startDate, endDate);

    if (!summary || dailyRecords.length === 0) {
      return null;
    }

    // Aggregate provider/model mix
    const providerMix: Record<string, { requests: number; cost: number; percentage: number }> = {};
    const modelMix: Record<string, { requests: number; cost: number; percentage: number }> = {};
    const taskCategoryMix: Record<string, { requests: number; cost: number }> = {};

    for (const day of dailyRecords) {
      // Provider mix
      for (const [provider, data] of Object.entries(day.byProvider)) {
        if (!providerMix[provider]) {
          providerMix[provider] = { requests: 0, cost: 0, percentage: 0 };
        }
        providerMix[provider].requests += data.requests;
        providerMix[provider].cost += data.cost;
      }

      // Model mix
      for (const [model, data] of Object.entries(day.byModel)) {
        if (!modelMix[model]) {
          modelMix[model] = { requests: 0, cost: 0, percentage: 0 };
        }
        modelMix[model].requests += data.requests;
        modelMix[model].cost += data.cost;
      }

      // Task category mix
      for (const [task, data] of Object.entries(day.byTaskCategory)) {
        if (!taskCategoryMix[task]) {
          taskCategoryMix[task] = { requests: 0, cost: 0 };
        }
        taskCategoryMix[task].requests += data.requests;
        taskCategoryMix[task].cost += data.cost;
      }
    }

    // Calculate percentages
    for (const provider in providerMix) {
      providerMix[provider].percentage =
        (providerMix[provider].requests / summary.totalRequests) * 100;
    }
    for (const model in modelMix) {
      modelMix[model].percentage = (modelMix[model].requests / summary.totalRequests) * 100;
    }

    // Calculate trends
    const midIndex = Math.floor(dailyRecords.length / 2);
    const firstHalf = dailyRecords.slice(midIndex);
    const secondHalf = dailyRecords.slice(0, midIndex);

    const firstCost = firstHalf.reduce((sum, d) => sum + d.totalCostUsd, 0);
    const secondCost = secondHalf.reduce((sum, d) => sum + d.totalCostUsd, 0);
    const firstReqs = firstHalf.reduce((sum, d) => sum + d.totalRequests, 0);
    const secondReqs = secondHalf.reduce((sum, d) => sum + d.totalRequests, 0);

    const costChange = firstCost > 0 ? (secondCost - firstCost) / firstCost : 0;
    const reqChange = firstReqs > 0 ? (secondReqs - firstReqs) / firstReqs : 0;

    return {
      organizationId,
      period: { startDate, endDate },
      summary: {
        totalCost: summary.totalCost,
        totalRequests: summary.totalRequests,
        avgDailyCost: summary.avgDailyCost,
        cacheHitRate: summary.cacheHitRate,
      },
      dailyBreakdown: dailyRecords,
      providerMix,
      modelMix,
      taskCategoryMix,
      trends: {
        costTrend: costChange > 0.1 ? 'increasing' : costChange < -0.1 ? 'decreasing' : 'stable',
        requestTrend: reqChange > 0.1 ? 'increasing' : reqChange < -0.1 ? 'decreasing' : 'stable',
      },
    };
  } catch (error) {
    logger.error('[UsageReport] Error generating report', error);
    return null;
  }
}
