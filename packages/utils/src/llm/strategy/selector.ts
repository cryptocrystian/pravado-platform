// =====================================================
// LLM MODEL SELECTOR (Cost-First Strategy)
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Core algorithm: Pick lowest-cost model meeting performance floor
// Score = price*0.6 + latency*0.35/1000 + error*0.05

import { PolicyConfig } from './policyConfig';
import { TaskCategory, qualityFor, getTaskCatalog } from './taskCatalog';
import { getTelemetry, shouldCircuitBreak, TelemetryMetrics } from '../metrics/telemetry';
import { recordDecision, DecisionLog } from './explainLogger';

// =====================================================
// TYPES
// =====================================================

export interface ModelSpec {
  provider: string;
  model: string;
  score: number;           // Lower is better (cost + latency + error)
  estimatedCost: number;   // USD for this request
  quality: number;         // Quality score from matrix (0-1)
  latencyMs: number;       // EWMA latency
  errorRate: number;       // EWMA error rate
  reason: string;          // Why this model was selected
}

export interface SelectionContext {
  taskCategory: TaskCategory;
  policy: PolicyConfig;
  inputTokens: number;
  outputTokens: number;
  minPerformance?: number; // Override minimum performance threshold
  organizationId?: string; // For decision logging (Sprint 70)
  agentType?: string;      // For decision logging (Sprint 70)
  forceCheapest?: boolean; // Budget constraint flag (Sprint 69)
}

export interface SelectionResult {
  selected: ModelSpec;
  alternatives: ModelSpec[]; // Other eligible models (sorted by score)
  filtered: {
    byProvider: string[];    // Models filtered due to provider restrictions
    byQuality: string[];     // Models below performance threshold
    byCircuit: string[];     // Circuit-broken models
  };
  decisionLog?: DecisionLog; // Decision log for explainability (Sprint 70)
}

// =====================================================
// PRICING TABLE (USD per 1M tokens)
// =====================================================
// Source: Official provider pricing as of 2024-01-01
// Update periodically or migrate to database

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'openai:gpt-4o': { input: 5.00, output: 15.00 },
  'openai:gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai:gpt-4-turbo': { input: 10.00, output: 30.00 },
  'openai:gpt-3.5-turbo': { input: 0.50, output: 1.50 },

  // Anthropic
  'anthropic:claude-3-opus': { input: 15.00, output: 75.00 },
  'anthropic:claude-3-sonnet': { input: 3.00, output: 15.00 },
  'anthropic:claude-3-haiku': { input: 0.25, output: 1.25 },
  'anthropic:claude-3-5-sonnet': { input: 3.00, output: 15.00 },

  // Fallback for unknown models (mid-tier pricing)
  'unknown:unknown': { input: 2.00, output: 6.00 },
};

// =====================================================
// COST ESTIMATION
// =====================================================

/**
 * Estimate cost in USD for a model request
 */
export function estimateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const key = `${provider}:${model}`;
  const pricing = MODEL_PRICING[key] || MODEL_PRICING['unknown:unknown'];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Get pricing for a model (used by cost display)
 */
export function getModelPricing(provider: string, model: string) {
  const key = `${provider}:${model}`;
  return MODEL_PRICING[key] || MODEL_PRICING['unknown:unknown'];
}

// =====================================================
// MODEL SCORING
// =====================================================

/**
 * Calculate selection score for a model
 * Lower score is better
 *
 * Formula: score = price*0.6 + latency*0.35/1000 + error*0.05
 *
 * Weights:
 * - Price: 60% (primary optimization target)
 * - Latency: 35% (important for UX)
 * - Error rate: 5% (reliability floor)
 */
export function scoreModel(
  _provider: string,
  _model: string,
  estimatedCost: number,
  telemetry?: TelemetryMetrics
): number {
  // Price component (normalized to cents, 60% weight)
  const priceScore = estimatedCost * 100 * 0.6;

  // Latency component (normalized to seconds, 35% weight)
  const latencyMs = telemetry?.latencyMs || 1000; // Default 1s if no telemetry
  const latencyScore = (latencyMs / 1000) * 0.35;

  // Error rate component (0-1 scale, 5% weight)
  const errorRate = telemetry?.errorRate || 0;
  const errorScore = errorRate * 0.05;

  return priceScore + latencyScore + errorScore;
}

// =====================================================
// MODEL FILTERING
// =====================================================

/**
 * Filter models by policy constraints and performance threshold
 */
export function filterEligibleModels(
  taskCategory: TaskCategory,
  policy: PolicyConfig,
  minPerformance?: number
): {
  eligible: Array<{ provider: string; model: string; quality: number }>;
  filtered: {
    byProvider: string[];
    byQuality: string[];
    byCircuit: string[];
  };
} {
  const filtered = {
    byProvider: [] as string[],
    byQuality: [] as string[],
    byCircuit: [] as string[],
  };

  // Get task requirements
  const taskCatalog = getTaskCatalog(taskCategory);
  const threshold = minPerformance ?? taskCatalog.minPerf;

  // Check if task has policy override
  const taskOverride = policy.taskOverrides?.[taskCategory];
  const effectiveThreshold = taskOverride?.minPerf ?? threshold;

  const eligible: Array<{ provider: string; model: string; quality: number }> = [];

  // Iterate through all models in pricing table
  for (const key of Object.keys(MODEL_PRICING)) {
    if (key === 'unknown:unknown') continue; // Skip fallback

    const [provider, model] = key.split(':');

    // Filter 1: Check if provider is allowed
    if (!policy.allowedProviders.includes(provider)) {
      filtered.byProvider.push(key);
      continue;
    }

    // Filter 2: Check quality threshold
    const quality = qualityFor(taskCategory, model);
    if (quality < effectiveThreshold) {
      filtered.byQuality.push(key);
      continue;
    }

    // Filter 3: Check circuit breaker
    if (shouldCircuitBreak(provider, model)) {
      filtered.byCircuit.push(key);
      continue;
    }

    // Model is eligible
    eligible.push({ provider, model, quality });
  }

  return { eligible, filtered };
}

// =====================================================
// DECISION LOGGING (Sprint 70)
// =====================================================

/**
 * Record a model selection decision for explainability
 */
function recordSelectionDecision(
  result: SelectionResult,
  context: SelectionContext,
  filtered: { byProvider: string[]; byQuality: string[]; byCircuit: string[] }
): DecisionLog {
  const { selected, alternatives } = result;
  const {
    organizationId,
    taskCategory,
    agentType,
    policy,
    minPerformance,
    forceCheapest,
  } = context;

  // Calculate decision factors (normalized 0-1)
  const costScore = selected.estimatedCost / 0.01; // Normalize to cents
  const latencyScore = selected.latencyMs / 1000; // Normalize to seconds
  const errorScore = selected.errorRate;
  const qualityScore = selected.quality;

  // Get telemetry for selected model
  const telemetry = getTelemetry(selected.provider, selected.model);

  // Build alternatives list
  const alternativesList = [
    ...alternatives.map((alt) => ({
      provider: alt.provider,
      model: alt.model,
      score: alt.score,
      rejected: false,
    })),
    ...filtered.byProvider.map((key) => {
      const [provider, model] = key.split(':');
      return {
        provider,
        model,
        score: 0,
        rejected: true,
        rejectReason: 'Provider not allowed by policy',
      };
    }),
    ...filtered.byQuality.map((key) => {
      const [provider, model] = key.split(':');
      return {
        provider,
        model,
        score: 0,
        rejected: true,
        rejectReason: 'Below quality threshold',
      };
    }),
    ...filtered.byCircuit.map((key) => {
      const [provider, model] = key.split(':');
      return {
        provider,
        model,
        score: 0,
        rejected: true,
        rejectReason: 'Circuit broken (high error rate)',
      };
    }),
  ];

  // Get task catalog for min performance
  const taskCatalog = getTaskCatalog(taskCategory);
  const effectiveMinPerf = minPerformance ?? taskCatalog.minPerf;

  // Build decision log
  const decisionLog = recordDecision({
    organizationId: organizationId || 'unknown',
    taskCategory,
    agentType,
    selectedProvider: selected.provider,
    selectedModel: selected.model,
    estimatedCost: selected.estimatedCost,
    factors: {
      costScore,
      latencyScore,
      errorScore,
      qualityScore,
      totalScore: selected.score,
    },
    alternatives: alternativesList,
    reason: selected.reason,
    constraints: {
      minPerformance: effectiveMinPerf,
      maxCost: policy.maxDailyCostUsd,
      allowedProviders: policy.allowedProviders,
      forceCheapest: forceCheapest || false,
    },
    telemetry: telemetry
      ? {
          latencyMs: telemetry.latencyMs,
          errorRate: telemetry.errorRate,
          requestCount: telemetry.requestCount,
        }
      : undefined,
  });

  return decisionLog;
}

// =====================================================
// MAIN SELECTOR
// =====================================================

/**
 * Select best model for a task using cost-first strategy
 *
 * Algorithm:
 * 1. Filter models by provider policy, quality threshold, circuit breaker
 * 2. Score each eligible model (cost + latency + error)
 * 3. Return lowest-scoring model (cheapest that meets quality)
 *
 * Graceful degradation:
 * - If no models meet quality threshold, relax by 10% and retry
 * - If still no models, return cheapest available with warning
 */
export function selectModel(context: SelectionContext): SelectionResult {
  const {
    taskCategory,
    policy,
    inputTokens,
    outputTokens,
    minPerformance,
    organizationId,
    agentType: _agentType,
    forceCheapest: _forceCheapest,
  } = context;

  // Filter eligible models
  const { eligible, filtered } = filterEligibleModels(taskCategory, policy, minPerformance);

  let result: SelectionResult;

  // If no eligible models, try relaxing quality threshold
  if (eligible.length === 0) {
    const taskCatalog = getTaskCatalog(taskCategory);
    const relaxedThreshold = (minPerformance ?? taskCatalog.minPerf) * 0.9;

    const retry = filterEligibleModels(taskCategory, policy, relaxedThreshold);

    if (retry.eligible.length === 0) {
      // Still no models - emergency fallback to cheapest allowed model
      result = emergencyFallback(policy, inputTokens, outputTokens, filtered);
    } else {
      // Use relaxed threshold results
      result = scoreAndRank(retry.eligible, inputTokens, outputTokens, filtered, true);
    }
  } else {
    // Score and rank eligible models
    result = scoreAndRank(eligible, inputTokens, outputTokens, filtered, false);
  }

  // Record decision log if organizationId provided (Sprint 70)
  if (organizationId) {
    result.decisionLog = recordSelectionDecision(
      result,
      context,
      filtered
    );
  }

  return result;
}

/**
 * Score eligible models and return ranked selection
 */
function scoreAndRank(
  eligible: Array<{ provider: string; model: string; quality: number }>,
  inputTokens: number,
  outputTokens: number,
  filtered: { byProvider: string[]; byQuality: string[]; byCircuit: string[] },
  relaxedThreshold: boolean
): SelectionResult {
  const scored: ModelSpec[] = [];

  for (const { provider, model, quality } of eligible) {
    const estimatedCost = estimateCost(provider, model, inputTokens, outputTokens);
    const telemetry = getTelemetry(provider, model);

    const score = scoreModel(provider, model, estimatedCost, telemetry || undefined);

    scored.push({
      provider,
      model,
      score,
      estimatedCost,
      quality,
      latencyMs: telemetry?.latencyMs || 1000,
      errorRate: telemetry?.errorRate || 0,
      reason: relaxedThreshold
        ? 'Selected with relaxed quality threshold (no models met original threshold)'
        : 'Lowest cost meeting performance requirements',
    });
  }

  // Sort by score (lowest = best)
  scored.sort((a, b) => a.score - b.score);

  return {
    selected: scored[0],
    alternatives: scored.slice(1),
    filtered,
  };
}

/**
 * Emergency fallback when no models meet any threshold
 * Returns cheapest allowed model with warning
 */
function emergencyFallback(
  policy: PolicyConfig,
  inputTokens: number,
  outputTokens: number,
  filtered: { byProvider: string[]; byQuality: string[]; byCircuit: string[] }
): SelectionResult {
  // Find cheapest model from allowed providers
  let cheapest: ModelSpec | null = null;

  for (const key of Object.keys(MODEL_PRICING)) {
    if (key === 'unknown:unknown') continue;

    const [provider, model] = key.split(':');

    if (!policy.allowedProviders.includes(provider)) continue;

    const estimatedCost = estimateCost(provider, model, inputTokens, outputTokens);
    const telemetry = getTelemetry(provider, model);
    const score = scoreModel(provider, model, estimatedCost, telemetry || undefined);

    if (!cheapest || estimatedCost < cheapest.estimatedCost) {
      cheapest = {
        provider,
        model,
        score,
        estimatedCost,
        quality: 0, // No quality guarantee in emergency mode
        latencyMs: telemetry?.latencyMs || 1000,
        errorRate: telemetry?.errorRate || 0,
        reason: 'Emergency fallback - no models met quality threshold, selected cheapest available',
      };
    }
  }

  if (!cheapest) {
    throw new Error('No models available - check policy allowed providers');
  }

  return {
    selected: cheapest,
    alternatives: [],
    filtered,
  };
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Get all models sorted by cost (for debugging/admin)
 */
export function getAllModelsByPrice(
  inputTokens: number = 1000,
  outputTokens: number = 1000
): Array<{ provider: string; model: string; cost: number }> {
  const models = [];

  for (const key of Object.keys(MODEL_PRICING)) {
    if (key === 'unknown:unknown') continue;

    const [provider, model] = key.split(':');
    const cost = estimateCost(provider, model, inputTokens, outputTokens);

    models.push({ provider, model, cost });
  }

  return models.sort((a, b) => a.cost - b.cost);
}

/**
 * Explain why a model was selected (for logging/debugging)
 */
export function explainSelection(result: SelectionResult): string {
  const { selected, alternatives, filtered } = result;

  let explanation = `Selected ${selected.provider}:${selected.model}\n`;
  explanation += `  Cost: $${selected.estimatedCost.toFixed(6)}\n`;
  explanation += `  Quality: ${(selected.quality * 100).toFixed(1)}%\n`;
  explanation += `  Latency: ${selected.latencyMs.toFixed(0)}ms\n`;
  explanation += `  Error Rate: ${(selected.errorRate * 100).toFixed(2)}%\n`;
  explanation += `  Score: ${selected.score.toFixed(4)} (lower is better)\n`;
  explanation += `  Reason: ${selected.reason}\n\n`;

  if (alternatives.length > 0) {
    explanation += `Alternatives (${alternatives.length}):\n`;
    for (const alt of alternatives.slice(0, 3)) {
      explanation += `  - ${alt.provider}:${alt.model} (score: ${alt.score.toFixed(4)}, cost: $${alt.estimatedCost.toFixed(6)})\n`;
    }
  }

  const totalFiltered =
    filtered.byProvider.length + filtered.byQuality.length + filtered.byCircuit.length;

  if (totalFiltered > 0) {
    explanation += `\nFiltered out ${totalFiltered} models:\n`;
    if (filtered.byProvider.length > 0) {
      explanation += `  - Provider restrictions: ${filtered.byProvider.length}\n`;
    }
    if (filtered.byQuality.length > 0) {
      explanation += `  - Below quality threshold: ${filtered.byQuality.length}\n`;
    }
    if (filtered.byCircuit.length > 0) {
      explanation += `  - Circuit broken: ${filtered.byCircuit.length}\n`;
    }
  }

  return explanation;
}

/**
 * Check if a specific model meets requirements for a task
 * Useful for testing/validation
 */
export function isModelEligible(
  provider: string,
  model: string,
  taskCategory: TaskCategory,
  policy: PolicyConfig,
  minPerformance?: number
): { eligible: boolean; reason: string } {
  // Check provider
  if (!policy.allowedProviders.includes(provider)) {
    return { eligible: false, reason: 'Provider not allowed by policy' };
  }

  // Check circuit breaker
  if (shouldCircuitBreak(provider, model)) {
    return { eligible: false, reason: 'Model is circuit-broken due to high error rate' };
  }

  // Check quality
  const taskCatalog = getTaskCatalog(taskCategory);
  const threshold = minPerformance ?? taskCatalog.minPerf;
  const quality = qualityFor(taskCategory, model);

  if (quality < threshold) {
    return {
      eligible: false,
      reason: `Quality ${(quality * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`,
    };
  }

  return { eligible: true, reason: 'Model meets all requirements' };
}
