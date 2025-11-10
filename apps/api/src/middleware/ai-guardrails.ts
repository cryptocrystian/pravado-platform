// =====================================================
// AI GUARDRAILS MIDDLEWARE
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Pre-flight enforcement of cost caps, token limits, and rate limits

import { Request, Response, NextFunction } from 'express';
import { getPolicyWithDefaults } from '../services/llm-policy.service';
import { canAffordRequest, BudgetCheckResult } from '../services/budget-guard.service';
import { estimateCost } from '@pravado/utils/llm/strategy/selector';
import { logger } from '../lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface AIRequestContext {
  organizationId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  taskCategory?: string;
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  budgetCheck?: BudgetCheckResult;
  forceCheapest?: boolean;
}

// =====================================================
// IN-MEMORY RATE LIMIT TRACKING
// =====================================================
// Note: For production, consider using Redis for distributed rate limiting

interface RateLimitEntry {
  burstCount: number;       // Requests in current burst window
  burstWindowStart: number; // Timestamp of burst window start
  sustainedCount: number;   // Requests in current sustained window (1 minute)
  sustainedWindowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const BURST_WINDOW_MS = 10000; // 10 seconds
const SUSTAINED_WINDOW_MS = 60000; // 1 minute

/**
 * Check rate limits for an organization
 */
function checkRateLimit(
  organizationId: string,
  burstLimit: number,
  sustainedLimit: number
): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const entry = rateLimitStore.get(organizationId);

  if (!entry) {
    // First request - initialize tracking
    rateLimitStore.set(organizationId, {
      burstCount: 1,
      burstWindowStart: now,
      sustainedCount: 1,
      sustainedWindowStart: now,
    });
    return { allowed: true };
  }

  // Check burst window
  const burstElapsed = now - entry.burstWindowStart;
  if (burstElapsed > BURST_WINDOW_MS) {
    // New burst window
    entry.burstCount = 1;
    entry.burstWindowStart = now;
  } else {
    // Within burst window
    if (entry.burstCount >= burstLimit) {
      return {
        allowed: false,
        reason: `Burst rate limit exceeded (${burstLimit} requests per 10 seconds)`,
      };
    }
    entry.burstCount++;
  }

  // Check sustained window
  const sustainedElapsed = now - entry.sustainedWindowStart;
  if (sustainedElapsed > SUSTAINED_WINDOW_MS) {
    // New sustained window
    entry.sustainedCount = 1;
    entry.sustainedWindowStart = now;
  } else {
    // Within sustained window
    if (entry.sustainedCount >= sustainedLimit) {
      return {
        allowed: false,
        reason: `Sustained rate limit exceeded (${sustainedLimit} requests per minute)`,
      };
    }
    entry.sustainedCount++;
  }

  rateLimitStore.set(organizationId, entry);
  return { allowed: true };
}

/**
 * Clear rate limit tracking for an organization (useful for testing)
 */
export function clearRateLimit(organizationId: string): void {
  rateLimitStore.delete(organizationId);
}

// =====================================================
// CONCURRENCY TRACKING
// =====================================================

const concurrencyStore = new Map<string, number>();

/**
 * Check if organization can start a new concurrent job
 */
function checkConcurrency(
  organizationId: string,
  maxConcurrent: number
): { allowed: boolean; reason?: string } {
  const current = concurrencyStore.get(organizationId) || 0;

  if (current >= maxConcurrent) {
    return {
      allowed: false,
      reason: `Concurrency limit exceeded (${current}/${maxConcurrent} active jobs)`,
    };
  }

  return { allowed: true };
}

/**
 * Increment concurrency count
 */
export function incrementConcurrency(organizationId: string): void {
  const current = concurrencyStore.get(organizationId) || 0;
  concurrencyStore.set(organizationId, current + 1);
}

/**
 * Decrement concurrency count
 */
export function decrementConcurrency(organizationId: string): void {
  const current = concurrencyStore.get(organizationId) || 0;
  concurrencyStore.set(organizationId, Math.max(0, current - 1));
}

/**
 * Get current concurrency for an organization
 */
export function getConcurrency(organizationId: string): number {
  return concurrencyStore.get(organizationId) || 0;
}

// =====================================================
// GUARDRAIL CHECKS
// =====================================================

/**
 * Run all guardrail checks for an AI request
 */
export async function checkGuardrails(context: AIRequestContext): Promise<GuardrailResult> {
  const { organizationId, provider, model, inputTokens, outputTokens } = context;

  try {
    // Get policy
    const policy = await getPolicyWithDefaults(organizationId);

    // Check 1: Token limits
    if (inputTokens > policy.maxTokensInput) {
      return {
        allowed: false,
        reason: `Input tokens (${inputTokens}) exceed limit (${policy.maxTokensInput})`,
      };
    }

    if (outputTokens > policy.maxTokensOutput) {
      return {
        allowed: false,
        reason: `Output tokens (${outputTokens}) exceed limit (${policy.maxTokensOutput})`,
      };
    }

    // Check 2: Provider allowed
    if (!policy.allowedProviders.includes(provider)) {
      return {
        allowed: false,
        reason: `Provider '${provider}' not allowed by policy. Allowed: ${policy.allowedProviders.join(', ')}`,
      };
    }

    // Check 3: Budget constraints
    const estimatedCost = estimateCost(provider, model, inputTokens, outputTokens);
    const budgetCheck = await canAffordRequest(organizationId, estimatedCost);

    if (!budgetCheck.allowed) {
      return {
        allowed: false,
        reason: budgetCheck.reason,
        budgetCheck,
      };
    }

    // Check 4: Rate limits
    const rateLimitCheck = checkRateLimit(
      organizationId,
      policy.burstRateLimit,
      policy.sustainedRateLimit
    );

    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        reason: rateLimitCheck.reason,
      };
    }

    // Check 5: Concurrency limits
    const concurrencyCheck = checkConcurrency(organizationId, policy.maxConcurrentJobs);

    if (!concurrencyCheck.allowed) {
      return {
        allowed: false,
        reason: concurrencyCheck.reason,
      };
    }

    // All checks passed
    return {
      allowed: true,
      budgetCheck,
      forceCheapest: budgetCheck.forceCheapest,
    };
  } catch (error) {
    logger.error('[Guardrails] Error in checkGuardrails', error);

    // Fail-safe: deny on error to prevent runaway costs
    return {
      allowed: false,
      reason: 'Guardrail check failed - denying request for safety',
    };
  }
}

// =====================================================
// EXPRESS MIDDLEWARE
// =====================================================

/**
 * Express middleware to enforce AI guardrails
 *
 * Expects request body to contain:
 * - organizationId: string
 * - provider: string
 * - model: string
 * - inputTokens: number
 * - outputTokens: number
 *
 * Attaches guardrailResult to req for downstream use
 */
export async function aiGuardrailsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { organizationId, provider, model, inputTokens, outputTokens, taskCategory } = req.body;

    // Validate required fields
    if (!organizationId || !provider || !model) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['organizationId', 'provider', 'model', 'inputTokens', 'outputTokens'],
      });
      return;
    }

    // Run guardrail checks
    const result = await checkGuardrails({
      organizationId,
      provider,
      model,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      taskCategory,
    });

    // Attach result to request for downstream use
    (req as any).guardrailResult = result;

    if (!result.allowed) {
      logger.warn('[Guardrails] Request blocked', {
        organizationId,
        reason: result.reason,
      });

      res.status(429).json({
        error: 'Request blocked by guardrails',
        reason: result.reason,
        budgetInfo: result.budgetCheck
          ? {
              dailySpend: result.budgetCheck.dailySpend,
              maxDailyBudget: result.budgetCheck.maxDailyBudget,
              remainingBudget: result.budgetCheck.remainingBudget,
            }
          : undefined,
      });
      return;
    }

    // Log if forcing cheapest model due to budget
    if (result.forceCheapest) {
      logger.info('[Guardrails] Forcing cheapest model', {
        organizationId,
        reason: result.budgetCheck?.reason,
      });
      (req as any).forceCheapest = true;
    }

    next();
  } catch (error) {
    logger.error('[Guardrails] Middleware error', error);
    res.status(500).json({
      error: 'Internal server error in guardrails check',
    });
  }
}

/**
 * Middleware to track concurrency
 * Use this AFTER aiGuardrailsMiddleware to increment counter
 */
export function concurrencyTrackerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { organizationId } = req.body;

  if (!organizationId) {
    next();
    return;
  }

  // Increment concurrency
  incrementConcurrency(organizationId);

  // Set up cleanup on response finish
  res.on('finish', () => {
    decrementConcurrency(organizationId);
  });

  // Also decrement on error
  res.on('error', () => {
    decrementConcurrency(organizationId);
  });

  next();
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Get guardrail status for an organization (useful for monitoring)
 */
export async function getGuardrailStatus(organizationId: string): Promise<{
  rateLimit: {
    burstCount: number;
    sustainedCount: number;
  };
  concurrency: number;
  budget: {
    dailySpend: number;
    maxDailyBudget: number;
    remainingBudget: number;
  };
}> {
  const { canAffordRequest } = await import('../services/budget-guard.service');
  const { getDailySpend, getRemainingBudget } = await import('../services/budget-guard.service');
  const { getPolicyWithDefaults } = await import('../services/llm-policy.service');

  const policy = await getPolicyWithDefaults(organizationId);
  const dailySpend = await getDailySpend(organizationId);
  const remainingBudget = await getRemainingBudget(organizationId);

  const rateEntry = rateLimitStore.get(organizationId) || {
    burstCount: 0,
    burstWindowStart: Date.now(),
    sustainedCount: 0,
    sustainedWindowStart: Date.now(),
  };

  return {
    rateLimit: {
      burstCount: rateEntry.burstCount,
      sustainedCount: rateEntry.sustainedCount,
    },
    concurrency: getConcurrency(organizationId),
    budget: {
      dailySpend,
      maxDailyBudget: policy.maxDailyCostUsd,
      remainingBudget,
    },
  };
}

/**
 * Reset all guardrails for an organization (useful for testing)
 */
export function resetGuardrails(organizationId: string): void {
  clearRateLimit(organizationId);
  concurrencyStore.delete(organizationId);
}
