// =====================================================
// LLM STRATEGY MODULE - BARREL EXPORT
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Centralized exports for policy, task catalog, and selector

// =====================================================
// POLICY CONFIGURATION
// =====================================================

export {
  // Types
  type PolicyConfig,
  type TaskOverride,

  // Default policies
  getDefaultTrialPolicy,
  getDefaultPaidPolicy,
  getEnvDefaultPolicy,

  // Policy merging and validation
  mergePolicyWithDefaults,
  validatePolicy,
  applyTrialRestrictions,
} from './policyConfig';

// =====================================================
// TASK CATALOG
// =====================================================

export {
  // Types
  type TaskCategory,
  type TaskCatalogEntry,

  // Constants
  QUALITY_MATRIX,
  TASK_CATALOG,

  // Lookup functions
  getTaskCatalog,
  qualityFor,
  getQualifiedModels,
  meetsPerformance,
  getPreferredModels,

  // Task detection
  inferTaskCategory,
  getAllTaskCategories,
  isValidTaskCategory,
} from './taskCatalog';

// =====================================================
// MODEL SELECTOR
// =====================================================

export {
  // Types
  type ModelSpec,
  type SelectionContext,
  type SelectionResult,

  // Constants
  MODEL_PRICING,

  // Core selection
  selectModel,
  filterEligibleModels,

  // Cost estimation
  estimateCost,
  getModelPricing,

  // Scoring
  scoreModel,

  // Utilities
  getAllModelsByPrice,
  explainSelection,
  isModelEligible,
} from './selector';

// =====================================================
// CONVENIENCE RE-EXPORTS
// =====================================================

// Re-export telemetry for easy access
export {
  type TelemetryMetrics,
  type RequestRecord,
  recordRequest,
  recordRequests,
  getTelemetry,
  getRecentTelemetry,
  getProviderTelemetry,
  shouldCircuitBreak,
  getCircuitBrokenModels,
  clearTelemetry,
  exportTelemetrySnapshot,
} from '../metrics/telemetry';
