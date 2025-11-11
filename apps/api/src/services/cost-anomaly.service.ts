// =====================================================
// COST ANOMALY DETECTION SERVICE
// Sprint 83: Post-Launch Reliability & SLO Automation
// =====================================================

import { supabase } from '../config/supabase';
import { logger } from '../lib/logger';
import { captureException } from './observability.service';

/**
 * Cost anomaly detection thresholds
 * Sprint 85: Adjusted from 20% to 25% based on production feedback
 */
const ANOMALY_THRESHOLDS = {
  // Flag if daily cost increases by more than this percentage
  DAILY_INCREASE_PERCENT: 25,
  // Baseline calculation period in days
  BASELINE_DAYS: 7,
  // Multiplier for baseline calculation (e.g., 1.25 = 25% above baseline)
  BASELINE_MULTIPLIER: 1.25,
};

export interface CostAnomaly {
  organization_id: string;
  date: string;
  current_cost_usd: number;
  baseline_cost_usd: number;
  percent_increase: number;
  severity: 'warning' | 'critical';
  detected_at: string;
}

/**
 * Detect cost anomalies for all organizations
 *
 * Compares today's cost against 7-day baseline average
 * Flags organizations exceeding 25% increase threshold (Sprint 85: adjusted from 20%)
 */
export async function detectCostAnomalies(): Promise<CostAnomaly[]> {
  try {
    logger.info('[Cost Anomaly] Starting detection...');

    const today = new Date().toISOString().split('T')[0];
    const baselineStartDate = new Date();
    baselineStartDate.setDate(baselineStartDate.getDate() - ANOMALY_THRESHOLDS.BASELINE_DAYS);
    const baselineStart = baselineStartDate.toISOString().split('T')[0];

    // Get daily costs per organization for the last 8 days (7 for baseline + 1 for today)
    const { data: usageData, error } = await supabase
      .from('ai_usage_ledger')
      .select('organization_id, created_at, estimated_cost_usd')
      .gte('created_at', baselineStart)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[Cost Anomaly] Failed to fetch usage data', { error });
      throw error;
    }

    if (!usageData || usageData.length === 0) {
      logger.info('[Cost Anomaly] No usage data found');
      return [];
    }

    // Group by organization and date
    const orgDailyCosts = new Map<string, Map<string, number>>();

    usageData.forEach((record) => {
      const orgId = record.organization_id;
      const date = record.created_at.split('T')[0];
      const cost = record.estimated_cost_usd || 0;

      if (!orgDailyCosts.has(orgId)) {
        orgDailyCosts.set(orgId, new Map<string, number>());
      }

      const dailyCosts = orgDailyCosts.get(orgId)!;
      dailyCosts.set(date, (dailyCosts.get(date) || 0) + cost);
    });

    // Detect anomalies
    const anomalies: CostAnomaly[] = [];

    for (const [orgId, dailyCosts] of orgDailyCosts.entries()) {
      const todayCost = dailyCosts.get(today) || 0;

      // Skip if no spending today
      if (todayCost === 0) {
        continue;
      }

      // Calculate baseline (average of last 7 days, excluding today)
      const baselineCosts: number[] = [];
      for (const [date, cost] of dailyCosts.entries()) {
        if (date !== today) {
          baselineCosts.push(cost);
        }
      }

      if (baselineCosts.length === 0) {
        // No historical data, skip
        continue;
      }

      const baselineAvg =
        baselineCosts.reduce((sum, cost) => sum + cost, 0) / baselineCosts.length;
      const baselineThreshold = baselineAvg * ANOMALY_THRESHOLDS.BASELINE_MULTIPLIER;

      // Check if today's cost exceeds threshold
      if (todayCost > baselineThreshold) {
        const percentIncrease = ((todayCost - baselineAvg) / baselineAvg) * 100;

        // Determine severity
        const severity: 'warning' | 'critical' =
          percentIncrease >= ANOMALY_THRESHOLDS.DAILY_INCREASE_PERCENT * 2
            ? 'critical'
            : 'warning';

        anomalies.push({
          organization_id: orgId,
          date: today,
          current_cost_usd: Math.round(todayCost * 100) / 100,
          baseline_cost_usd: Math.round(baselineAvg * 100) / 100,
          percent_increase: Math.round(percentIncrease * 100) / 100,
          severity,
          detected_at: new Date().toISOString(),
        });

        logger.warn('[Cost Anomaly] Detected anomaly', {
          org_id: orgId,
          current_cost: todayCost,
          baseline: baselineAvg,
          percent_increase: percentIncrease,
          severity,
        });
      }
    }

    logger.info('[Cost Anomaly] Detection complete', {
      total_orgs_checked: orgDailyCosts.size,
      anomalies_found: anomalies.length,
    });

    return anomalies;
  } catch (error) {
    logger.error('[Cost Anomaly] Detection failed', { error });
    captureException(error as Error, { context: 'detectCostAnomalies' });
    throw error;
  }
}

/**
 * Get recent cost anomalies (last 7 days)
 */
export async function getRecentCostAnomalies(): Promise<CostAnomaly[]> {
  try {
    // For now, run live detection
    // In production, this could be cached or stored in a separate table
    const anomalies = await detectCostAnomalies();

    // Filter to last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return anomalies.filter((anomaly) => new Date(anomaly.date) >= sevenDaysAgo);
  } catch (error) {
    logger.error('[Cost Anomaly] Failed to get recent anomalies', { error });
    return [];
  }
}

/**
 * Get cost anomaly summary for an organization
 */
export async function getOrgCostAnomalySummary(
  orgId: string
): Promise<{
  has_anomaly: boolean;
  current_cost_usd: number;
  baseline_cost_usd: number;
  percent_increase: number;
} | null> {
  try {
    const anomalies = await detectCostAnomalies();
    const orgAnomaly = anomalies.find((a) => a.organization_id === orgId);

    if (!orgAnomaly) {
      return null;
    }

    return {
      has_anomaly: true,
      current_cost_usd: orgAnomaly.current_cost_usd,
      baseline_cost_usd: orgAnomaly.baseline_cost_usd,
      percent_increase: orgAnomaly.percent_increase,
    };
  } catch (error) {
    logger.error('[Cost Anomaly] Failed to get org summary', { org_id: orgId, error });
    return null;
  }
}
