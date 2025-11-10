// =====================================================
// POLICY ADAPTATION SERVICE
// Sprint 70: LLM Insights & Explainability Layer
// =====================================================
// Auto-tune EWMA α and disable poor-performing providers

import { getProviderHealthStatus } from './telemetry-aggregator.service';
import { getPolicyWithDefaults } from './llm-policy.service';
import { supabase } from '../lib/supabase';
import {
  getRecentTelemetry,
  getTelemetry,
  setAlpha,
  getAlpha,
} from '@pravado/utils/llm/metrics/telemetry';
import { logger } from '../lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface AdaptationResult {
  organizationId: string;
  timestamp: Date;
  adaptations: {
    alphaAdjustments: Array<{
      provider: string;
      model: string;
      oldAlpha: number;
      newAlpha: number;
      reason: string;
    }>;
    providerDisablements: Array<{
      provider: string;
      reason: string;
      errorRate: number;
      threshold: number;
    }>;
    providerEnablements: Array<{
      provider: string;
      reason: string;
      errorRate: number;
    }>;
  };
  recommendations: string[];
}

export interface AlphaAdaptationConfig {
  minAlpha: number;       // Minimum α (most reactive)
  maxAlpha: number;       // Maximum α (most stable)
  targetVariance: number; // Target variance for stability
  adjustmentStep: number; // How much to adjust α per iteration
}

export interface DisablementConfig {
  errorThreshold: number;     // Error rate to disable (default: 0.5 = 50%)
  minRequestsBeforeDisable: number; // Minimum requests before considering disable
  recoveryThreshold: number;  // Error rate to re-enable (default: 0.2 = 20%)
  minRequestsBeforeEnable: number;  // Minimum requests before considering enable
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_ALPHA_CONFIG: AlphaAdaptationConfig = {
  minAlpha: 0.1,  // Highly reactive (new data weighted 10%)
  maxAlpha: 0.5,  // Stable (new data weighted 50%)
  targetVariance: 0.1, // Target 10% variance
  adjustmentStep: 0.05, // Adjust by 5% per iteration
};

const DEFAULT_DISABLEMENT_CONFIG: DisablementConfig = {
  errorThreshold: 0.5,
  minRequestsBeforeDisable: 10,
  recoveryThreshold: 0.2,
  minRequestsBeforeEnable: 5,
};

// =====================================================
// ALPHA ADAPTATION
// =====================================================

/**
 * Auto-tune EWMA α for a provider/model
 *
 * Strategy:
 * - If metric is volatile (high variance), increase α (more reactive)
 * - If metric is stable (low variance), decrease α (more smoothing)
 */
export async function autoTuneAlpha(
  provider: string,
  model: string,
  config: AlphaAdaptationConfig = DEFAULT_ALPHA_CONFIG
): Promise<{
  adjusted: boolean;
  oldAlpha: number;
  newAlpha: number;
  reason: string;
}> {
  try {
    // Get current alpha
    const currentAlpha = getAlpha(provider, model);

    // Get historical metrics to calculate variance
    const telemetry = getTelemetry(provider, model);

    if (!telemetry) {
      return {
        adjusted: false,
        oldAlpha: currentAlpha,
        newAlpha: currentAlpha,
        reason: 'No telemetry data available',
      };
    }

    // Calculate variance from recent telemetry
    // For simplicity, we'll use latency variance as proxy for stability
    const variance = calculateMetricVariance(provider, model);

    if (variance === null) {
      return {
        adjusted: false,
        oldAlpha: currentAlpha,
        newAlpha: currentAlpha,
        reason: 'Insufficient data for variance calculation',
      };
    }

    let newAlpha = currentAlpha;
    let reason = 'No adjustment needed';

    // If variance is high (unstable), increase alpha (more reactive)
    if (variance > config.targetVariance) {
      newAlpha = Math.min(currentAlpha + config.adjustmentStep, config.maxAlpha);
      reason = `High variance (${variance.toFixed(3)}) - increasing reactivity`;
    }
    // If variance is low (stable), decrease alpha (more smoothing)
    else if (variance < config.targetVariance / 2) {
      newAlpha = Math.max(currentAlpha - config.adjustmentStep, config.minAlpha);
      reason = `Low variance (${variance.toFixed(3)}) - increasing smoothing`;
    }

    // Apply adjustment if changed
    if (newAlpha !== currentAlpha) {
      setAlpha(provider, model, newAlpha);

      logger.info('[PolicyAdaptation] Adjusted EWMA alpha', {
        provider,
        model,
        oldAlpha: currentAlpha,
        newAlpha,
        variance,
        reason,
      });

      return {
        adjusted: true,
        oldAlpha: currentAlpha,
        newAlpha,
        reason,
      };
    }

    return {
      adjusted: false,
      oldAlpha: currentAlpha,
      newAlpha: currentAlpha,
      reason,
    };
  } catch (error) {
    logger.error('[PolicyAdaptation] Error auto-tuning alpha', error);
    return {
      adjusted: false,
      oldAlpha: getAlpha(provider, model),
      newAlpha: getAlpha(provider, model),
      reason: 'Error during adjustment',
    };
  }
}

/**
 * Calculate metric variance for stability assessment
 * Returns null if insufficient data
 */
function calculateMetricVariance(provider: string, model: string): number | null {
  // TODO: Implement historical variance calculation
  // For now, return a placeholder based on current metrics

  const telemetry = getTelemetry(provider, model);
  if (!telemetry || telemetry.requestCount < 10) {
    return null;
  }

  // Use error rate as a proxy for stability
  // Higher error rate = higher variance = more unstable
  return telemetry.errorRate;
}

// =====================================================
// PROVIDER DISABLEMENT
// =====================================================

/**
 * Auto-disable providers with high error rates
 */
export async function checkAndDisableProviders(
  organizationId: string,
  config: DisablementConfig = DEFAULT_DISABLEMENT_CONFIG
): Promise<Array<{
  provider: string;
  disabled: boolean;
  reason: string;
  errorRate: number;
}>> {
  try {
    const policy = await getPolicyWithDefaults(organizationId);
    const telemetry = getRecentTelemetry();

    const results: Array<{
      provider: string;
      disabled: boolean;
      reason: string;
      errorRate: number;
    }> = [];

    for (const [key, metrics] of Object.entries(telemetry)) {
      const { provider, model } = metrics;

      // Skip if not enough requests
      if (metrics.requestCount < config.minRequestsBeforeDisable) {
        continue;
      }

      // Check if error rate exceeds threshold
      if (metrics.errorRate >= config.errorThreshold) {
        // Check if provider is currently allowed
        if (policy.allowedProviders.includes(provider)) {
          // Disable provider
          await disableProvider(organizationId, provider);

          results.push({
            provider,
            disabled: true,
            reason: `Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds threshold ${(config.errorThreshold * 100).toFixed(1)}%`,
            errorRate: metrics.errorRate,
          });

          logger.warn('[PolicyAdaptation] Auto-disabled provider', {
            organizationId,
            provider,
            model,
            errorRate: metrics.errorRate,
            threshold: config.errorThreshold,
          });
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('[PolicyAdaptation] Error checking provider disablement', error);
    return [];
  }
}

/**
 * Auto-enable providers that have recovered
 */
export async function checkAndEnableProviders(
  organizationId: string,
  config: DisablementConfig = DEFAULT_DISABLEMENT_CONFIG
): Promise<Array<{
  provider: string;
  enabled: boolean;
  reason: string;
  errorRate: number;
}>> {
  try {
    const policy = await getPolicyWithDefaults(organizationId);
    const telemetry = getRecentTelemetry();

    const results: Array<{
      provider: string;
      enabled: boolean;
      reason: string;
      errorRate: number;
    }> = [];

    // Get all providers (both allowed and disabled)
    const allProviders = ['openai', 'anthropic']; // TODO: Make this dynamic

    for (const provider of allProviders) {
      // Skip if already enabled
      if (policy.allowedProviders.includes(provider)) {
        continue;
      }

      // Get telemetry for this provider
      const providerMetrics = Object.values(telemetry).filter(
        (m) => m.provider === provider
      );

      if (providerMetrics.length === 0) {
        continue;
      }

      // Calculate average error rate across all models
      const avgErrorRate =
        providerMetrics.reduce((sum, m) => sum + m.errorRate, 0) /
        providerMetrics.length;

      const totalRequests = providerMetrics.reduce((sum, m) => sum + m.requestCount, 0);

      // Skip if not enough requests
      if (totalRequests < config.minRequestsBeforeEnable) {
        continue;
      }

      // Check if error rate is below recovery threshold
      if (avgErrorRate <= config.recoveryThreshold) {
        // Re-enable provider
        await enableProvider(organizationId, provider);

        results.push({
          provider,
          enabled: true,
          reason: `Error rate ${(avgErrorRate * 100).toFixed(1)}% below recovery threshold ${(config.recoveryThreshold * 100).toFixed(1)}%`,
          errorRate: avgErrorRate,
        });

        logger.info('[PolicyAdaptation] Auto-enabled provider', {
          organizationId,
          provider,
          avgErrorRate,
          threshold: config.recoveryThreshold,
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('[PolicyAdaptation] Error checking provider enablement', error);
    return [];
  }
}

/**
 * Disable a provider for an organization
 */
async function disableProvider(
  organizationId: string,
  provider: string
): Promise<void> {
  const policy = await getPolicyWithDefaults(organizationId);

  const updatedProviders = policy.allowedProviders.filter((p) => p !== provider);

  await supabase
    .from('ai_policy')
    .upsert({
      organization_id: organizationId,
      allowed_providers: updatedProviders,
      updated_at: new Date().toISOString(),
    });
}

/**
 * Enable a provider for an organization
 */
async function enableProvider(
  organizationId: string,
  provider: string
): Promise<void> {
  const policy = await getPolicyWithDefaults(organizationId);

  if (!policy.allowedProviders.includes(provider)) {
    const updatedProviders = [...policy.allowedProviders, provider];

    await supabase
      .from('ai_policy')
      .upsert({
        organization_id: organizationId,
        allowed_providers: updatedProviders,
        updated_at: new Date().toISOString(),
      });
  }
}

// =====================================================
// COMPREHENSIVE ADAPTATION
// =====================================================

/**
 * Run comprehensive policy adaptation for an organization
 *
 * This is the main function called by the cron job
 */
export async function adaptPolicy(
  organizationId: string,
  alphaConfig: AlphaAdaptationConfig = DEFAULT_ALPHA_CONFIG,
  disablementConfig: DisablementConfig = DEFAULT_DISABLEMENT_CONFIG
): Promise<AdaptationResult> {
  try {
    logger.info('[PolicyAdaptation] Running policy adaptation', { organizationId });

    const timestamp = new Date();
    const alphaAdjustments: AdaptationResult['adaptations']['alphaAdjustments'] = [];
    const recommendations: string[] = [];

    // 1. Auto-tune EWMA alpha for all active models
    const telemetry = getRecentTelemetry();

    for (const [key, metrics] of Object.entries(telemetry)) {
      const { provider, model } = metrics;

      const alphaResult = await autoTuneAlpha(provider, model, alphaConfig);

      if (alphaResult.adjusted) {
        alphaAdjustments.push({
          provider,
          model,
          oldAlpha: alphaResult.oldAlpha,
          newAlpha: alphaResult.newAlpha,
          reason: alphaResult.reason,
        });
      }
    }

    // 2. Check and disable poor-performing providers
    const disablements = await checkAndDisableProviders(organizationId, disablementConfig);

    // 3. Check and re-enable recovered providers
    const enablements = await checkAndEnableProviders(organizationId, disablementConfig);

    // 4. Generate recommendations
    if (alphaAdjustments.length > 0) {
      recommendations.push(
        `Adjusted EWMA α for ${alphaAdjustments.length} models to improve tracking accuracy`
      );
    }

    if (disablements.length > 0) {
      recommendations.push(
        `Disabled ${disablements.length} providers due to high error rates - monitor for recovery`
      );
    }

    if (enablements.length > 0) {
      recommendations.push(
        `Re-enabled ${enablements.length} providers after error rates recovered`
      );
    }

    if (alphaAdjustments.length === 0 && disablements.length === 0 && enablements.length === 0) {
      recommendations.push('No policy adaptations needed - all metrics within normal ranges');
    }

    const result: AdaptationResult = {
      organizationId,
      timestamp,
      adaptations: {
        alphaAdjustments,
        providerDisablements: disablements.filter((d) => d.disabled),
        providerEnablements: enablements.filter((e) => e.enabled),
      },
      recommendations,
    };

    logger.info('[PolicyAdaptation] Policy adaptation complete', {
      organizationId,
      alphaAdjustments: alphaAdjustments.length,
      disablements: disablements.length,
      enablements: enablements.length,
    });

    return result;
  } catch (error) {
    logger.error('[PolicyAdaptation] Error adapting policy', error);
    throw error;
  }
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Get adaptation configuration
 */
export function getAdaptationConfig(): {
  alpha: AlphaAdaptationConfig;
  disablement: DisablementConfig;
  enabled: boolean;
} {
  return {
    alpha: DEFAULT_ALPHA_CONFIG,
    disablement: DEFAULT_DISABLEMENT_CONFIG,
    enabled: process.env.ENABLE_POLICY_ADAPTATION === 'true',
  };
}

/**
 * Check if policy adaptation is enabled
 */
export function isAdaptationEnabled(): boolean {
  return process.env.ENABLE_POLICY_ADAPTATION === 'true';
}
