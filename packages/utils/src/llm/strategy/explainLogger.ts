// =====================================================
// LLM DECISION EXPLAINABILITY LOGGER
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Records every routing decision with full rationale

export interface DecisionFactors {
  costScore: number;           // Contribution from cost (0-1)
  latencyScore: number;        // Contribution from latency (0-1)
  errorScore: number;          // Contribution from error rate (0-1)
  qualityScore: number;        // Quality from matrix (0-1)
  totalScore: number;          // Final weighted score
}

export interface DecisionLog {
  id: string;                  // Unique log ID
  timestamp: Date;

  // Request context
  organizationId: string;
  taskCategory: string;
  agentType?: string;

  // Selected model
  selectedProvider: string;
  selectedModel: string;
  estimatedCost: number;

  // Decision factors
  factors: DecisionFactors;

  // Alternatives considered
  alternatives: Array<{
    provider: string;
    model: string;
    score: number;
    rejected: boolean;
    rejectReason?: string;      // e.g., "Below quality threshold", "Circuit broken"
  }>;

  // Rationale
  reason: string;               // Human-readable explanation

  // Policy constraints applied
  constraints: {
    minPerformance: number;
    maxCost?: number;
    allowedProviders: string[];
    forceCheapest: boolean;
  };

  // Telemetry at decision time
  telemetry?: {
    latencyMs: number;
    errorRate: number;
    requestCount: number;
  };
}

// =====================================================
// IN-MEMORY DECISION LOG STORE
// =====================================================

// Store last N decisions per organization (circular buffer)
const MAX_LOGS_PER_ORG = 100;
const decisionLogs = new Map<string, DecisionLog[]>();

/**
 * Get storage key for organization
 */
function getOrgKey(organizationId: string): string {
  return `org:${organizationId}`;
}

// =====================================================
// LOGGING FUNCTIONS
// =====================================================

/**
 * Record a model selection decision
 */
export function recordDecision(log: Omit<DecisionLog, 'id' | 'timestamp'>): DecisionLog {
  const fullLog: DecisionLog = {
    ...log,
    id: `decision-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date(),
  };

  const orgKey = getOrgKey(log.organizationId);
  const orgLogs = decisionLogs.get(orgKey) || [];

  // Add to front of array
  orgLogs.unshift(fullLog);

  // Trim to max size (circular buffer)
  if (orgLogs.length > MAX_LOGS_PER_ORG) {
    orgLogs.pop();
  }

  decisionLogs.set(orgKey, orgLogs);

  return fullLog;
}

/**
 * Get decision logs for an organization
 */
export function getDecisionLogs(
  organizationId: string,
  options?: {
    limit?: number;
    taskCategory?: string;
    provider?: string;
    startDate?: Date;
    endDate?: Date;
  }
): DecisionLog[] {
  const orgKey = getOrgKey(organizationId);
  let logs = decisionLogs.get(orgKey) || [];

  // Apply filters
  if (options?.taskCategory) {
    logs = logs.filter((log) => log.taskCategory === options.taskCategory);
  }

  if (options?.provider) {
    logs = logs.filter((log) => log.selectedProvider === options.provider);
  }

  if (options?.startDate) {
    logs = logs.filter((log) => log.timestamp >= options.startDate!);
  }

  if (options?.endDate) {
    logs = logs.filter((log) => log.timestamp <= options.endDate!);
  }

  // Apply limit
  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * Get latest decision for an organization
 */
export function getLatestDecision(organizationId: string): DecisionLog | null {
  const logs = getDecisionLogs(organizationId, { limit: 1 });
  return logs.length > 0 ? logs[0] : null;
}

/**
 * Get decision statistics for an organization
 */
export function getDecisionStats(organizationId: string): {
  totalDecisions: number;
  byProvider: Record<string, number>;
  byTaskCategory: Record<string, number>;
  avgCost: number;
  forceCheapestCount: number;
} {
  const logs = getDecisionLogs(organizationId);

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

/**
 * Get provider performance summary from decisions
 */
export function getProviderPerformance(organizationId: string): Array<{
  provider: string;
  model: string;
  timesSelected: number;
  avgCost: number;
  avgScore: number;
}> {
  const logs = getDecisionLogs(organizationId);

  const providerMap = new Map<
    string,
    { count: number; totalCost: number; totalScore: number }
  >();

  for (const log of logs) {
    const key = `${log.selectedProvider}:${log.selectedModel}`;
    const existing = providerMap.get(key) || { count: 0, totalCost: 0, totalScore: 0 };

    existing.count++;
    existing.totalCost += log.estimatedCost;
    existing.totalScore += log.factors.totalScore;

    providerMap.set(key, existing);
  }

  const results: Array<{
    provider: string;
    model: string;
    timesSelected: number;
    avgCost: number;
    avgScore: number;
  }> = [];

  for (const [key, stats] of providerMap.entries()) {
    const [provider, model] = key.split(':');
    results.push({
      provider,
      model,
      timesSelected: stats.count,
      avgCost: stats.totalCost / stats.count,
      avgScore: stats.totalScore / stats.count,
    });
  }

  // Sort by times selected (descending)
  results.sort((a, b) => b.timesSelected - a.timesSelected);

  return results;
}

/**
 * Clear decision logs for an organization (useful for testing)
 */
export function clearDecisionLogs(organizationId: string): void {
  const orgKey = getOrgKey(organizationId);
  decisionLogs.delete(orgKey);
}

/**
 * Clear all decision logs
 */
export function clearAllDecisionLogs(): void {
  decisionLogs.clear();
}

/**
 * Get total number of logged decisions across all organizations
 */
export function getTotalDecisionCount(): number {
  let total = 0;
  for (const logs of decisionLogs.values()) {
    total += logs.length;
  }
  return total;
}

// =====================================================
// DECISION EXPLANATION HELPERS
// =====================================================

/**
 * Generate human-readable explanation from decision log
 */
export function explainDecision(log: DecisionLog): string {
  const parts: string[] = [];

  // Header
  parts.push(`Decision for ${log.taskCategory} task:`);
  parts.push(`Selected: ${log.selectedProvider}:${log.selectedModel}`);
  parts.push(`Cost: $${log.estimatedCost.toFixed(6)}`);
  parts.push('');

  // Factors breakdown
  parts.push('Decision Factors:');
  parts.push(`  Cost Score: ${(log.factors.costScore * 100).toFixed(1)}%`);
  parts.push(`  Latency Score: ${(log.factors.latencyScore * 100).toFixed(1)}%`);
  parts.push(`  Error Score: ${(log.factors.errorScore * 100).toFixed(1)}%`);
  parts.push(`  Quality Score: ${(log.factors.qualityScore * 100).toFixed(1)}%`);
  parts.push(`  Total Score: ${log.factors.totalScore.toFixed(4)} (lower is better)`);
  parts.push('');

  // Constraints
  parts.push('Policy Constraints:');
  parts.push(`  Min Performance: ${(log.constraints.minPerformance * 100).toFixed(1)}%`);
  parts.push(`  Allowed Providers: ${log.constraints.allowedProviders.join(', ')}`);
  if (log.constraints.forceCheapest) {
    parts.push(`  ⚠️ FORCED CHEAPEST (budget constraint)`);
  }
  if (log.constraints.maxCost) {
    parts.push(`  Max Cost: $${log.constraints.maxCost.toFixed(4)}`);
  }
  parts.push('');

  // Alternatives
  if (log.alternatives.length > 0) {
    parts.push(`Alternatives Considered (${log.alternatives.length}):`);
    for (const alt of log.alternatives.slice(0, 5)) {
      const status = alt.rejected ? `❌ ${alt.rejectReason}` : '✓';
      parts.push(`  ${status} ${alt.provider}:${alt.model} (score: ${alt.score.toFixed(4)})`);
    }
    parts.push('');
  }

  // Telemetry
  if (log.telemetry) {
    parts.push('Performance Telemetry:');
    parts.push(`  Latency: ${log.telemetry.latencyMs.toFixed(0)}ms`);
    parts.push(`  Error Rate: ${(log.telemetry.errorRate * 100).toFixed(2)}%`);
    parts.push(`  Request Count: ${log.telemetry.requestCount}`);
    parts.push('');
  }

  // Rationale
  parts.push(`Rationale: ${log.reason}`);

  return parts.join('\n');
}

/**
 * Export decision logs as JSON for analysis
 */
export function exportDecisionLogs(organizationId: string): {
  organizationId: string;
  exportDate: Date;
  totalLogs: number;
  logs: DecisionLog[];
  stats: ReturnType<typeof getDecisionStats>;
} {
  const logs = getDecisionLogs(organizationId);
  const stats = getDecisionStats(organizationId);

  return {
    organizationId,
    exportDate: new Date(),
    totalLogs: logs.length,
    logs,
    stats,
  };
}
