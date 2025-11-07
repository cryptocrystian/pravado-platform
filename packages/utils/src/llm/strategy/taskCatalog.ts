// =====================================================
// TASK CATALOG & QUALITY MATRIX
// Sprint 69: Dynamic LLM Strategy Manager
// =====================================================
// Defines task categories and model quality scores

export type TaskCategory =
  | 'drafting-short'
  | 'drafting-long'
  | 'structured-json'
  | 'summarization'
  | 'seo-keywords'
  | 'pr-pitch'
  | 'analyst'
  | 'safe-mode';

export interface TaskCatalogEntry {
  category: TaskCategory;
  description: string;
  minPerf: number; // Default minimum performance threshold
  preferredModels: string[]; // Ordered by cost (cheapest first)
}

// =====================================================
// QUALITY MATRIX (Configurable)
// =====================================================
// Quality scores per model/task combination (0-1 scale)
// Based on benchmarks, observed performance, and use case suitability

export const QUALITY_MATRIX: Record<TaskCategory, Record<string, number>> = {
  'drafting-short': {
    'gpt-4o-mini': 0.75,
    'claude-3-haiku': 0.70,
    'gpt-4o': 0.90,
    'claude-3-sonnet': 0.85,
    'claude-3-opus': 0.88,
  },
  'drafting-long': {
    'gpt-4o-mini': 0.60,
    'claude-3-haiku': 0.55,
    'gpt-4o': 0.92,
    'claude-3-sonnet': 0.95,
    'claude-3-opus': 0.97,
  },
  'structured-json': {
    'gpt-4o-mini': 0.80,
    'claude-3-haiku': 0.65,
    'gpt-4o': 0.95,
    'claude-3-sonnet': 0.90,
    'claude-3-opus': 0.92,
  },
  'summarization': {
    'gpt-4o-mini': 0.80,
    'claude-3-haiku': 0.85,
    'gpt-4o': 0.88,
    'claude-3-sonnet': 0.87,
    'claude-3-opus': 0.90,
  },
  'seo-keywords': {
    'gpt-4o-mini': 0.85,
    'claude-3-haiku': 0.75,
    'gpt-4o': 0.90,
    'claude-3-sonnet': 0.82,
    'claude-3-opus': 0.85,
  },
  'pr-pitch': {
    'gpt-4o-mini': 0.60,
    'claude-3-haiku': 0.55,
    'gpt-4o': 0.88,
    'claude-3-sonnet': 0.92,
    'claude-3-opus': 0.95,
  },
  'analyst': {
    'gpt-4o-mini': 0.65,
    'claude-3-haiku': 0.60,
    'gpt-4o': 0.90,
    'claude-3-sonnet': 0.93,
    'claude-3-opus': 0.96,
  },
  'safe-mode': {
    'gpt-4o-mini': 0.70,
    'claude-3-haiku': 0.75,
    'gpt-4o': 0.85,
    'claude-3-sonnet': 0.80,
    'claude-3-opus': 0.82,
  },
};

// =====================================================
// TASK CATALOG
// =====================================================

export const TASK_CATALOG: Record<TaskCategory, TaskCatalogEntry> = {
  'drafting-short': {
    category: 'drafting-short',
    description: 'Short-form content drafting (emails, social posts, brief descriptions)',
    minPerf: 0.6,
    preferredModels: ['gpt-4o-mini', 'claude-3-haiku', 'gpt-4o'],
  },
  'drafting-long': {
    category: 'drafting-long',
    description: 'Long-form creative writing (articles, blog posts, press releases)',
    minPerf: 0.7,
    preferredModels: ['claude-3-sonnet', 'gpt-4o', 'claude-3-opus'],
  },
  'structured-json': {
    category: 'structured-json',
    description: 'Structured output generation with JSON mode or tool calling',
    minPerf: 0.8,
    preferredModels: ['gpt-4o', 'claude-3-sonnet', 'gpt-4o-mini'],
  },
  'summarization': {
    category: 'summarization',
    description: 'Text summarization and condensation',
    minPerf: 0.6,
    preferredModels: ['claude-3-haiku', 'gpt-4o-mini', 'claude-3-sonnet'],
  },
  'seo-keywords': {
    category: 'seo-keywords',
    description: 'SEO keyword generation and optimization hints',
    minPerf: 0.6,
    preferredModels: ['gpt-4o-mini', 'claude-3-haiku', 'gpt-4o'],
  },
  'pr-pitch': {
    category: 'pr-pitch',
    description: 'PR pitch generation with style and persuasion quality',
    minPerf: 0.8,
    preferredModels: ['claude-3-sonnet', 'gpt-4o', 'claude-3-opus'],
  },
  'analyst': {
    category: 'analyst',
    description: 'Analysis, reasoning, and explanation tasks',
    minPerf: 0.8,
    preferredModels: ['claude-3-sonnet', 'gpt-4o', 'claude-3-opus'],
  },
  'safe-mode': {
    category: 'safe-mode',
    description: 'Free trial / safe mode with strict token caps',
    minPerf: 0.5,
    preferredModels: ['gpt-4o-mini', 'claude-3-haiku'],
  },
};

// =====================================================
// LOOKUP FUNCTIONS
// =====================================================

/**
 * Get task catalog entry for a category
 */
export function getTaskCatalog(category: TaskCategory): TaskCatalogEntry {
  return TASK_CATALOG[category];
}

/**
 * Get quality score for a specific model/task combination
 * Returns 0 if model is not rated for this task
 */
export function qualityFor(category: TaskCategory, model: string): number {
  const categoryMatrix = QUALITY_MATRIX[category];
  if (!categoryMatrix) return 0;

  return categoryMatrix[model] ?? 0;
}

/**
 * Get all models that meet minimum performance for a task
 */
export function getQualifiedModels(
  category: TaskCategory,
  minPerf: number
): Array<{ model: string; quality: number }> {
  const categoryMatrix = QUALITY_MATRIX[category];
  if (!categoryMatrix) return [];

  return Object.entries(categoryMatrix)
    .filter(([_, quality]) => quality >= minPerf)
    .map(([model, quality]) => ({ model, quality }))
    .sort((a, b) => b.quality - a.quality); // Sort by quality descending
}

/**
 * Check if a model meets minimum performance for a task
 */
export function meetsPerformance(
  category: TaskCategory,
  model: string,
  minPerf: number
): boolean {
  const quality = qualityFor(category, model);
  return quality >= minPerf;
}

/**
 * Get preferred models for a task, filtered by minimum performance
 * Returns models in cost order (cheapest first) that meet the threshold
 */
export function getPreferredModels(
  category: TaskCategory,
  minPerf?: number
): string[] {
  const catalogEntry = TASK_CATALOG[category];
  if (!catalogEntry) return [];

  const threshold = minPerf ?? catalogEntry.minPerf;

  // Filter preferred models by performance threshold
  return catalogEntry.preferredModels.filter((model) =>
    meetsPerformance(category, model, threshold)
  );
}

// =====================================================
// TASK DETECTION
// =====================================================

/**
 * Infer task category from agent type or task description
 * Used by agent-runner to map agent types to task categories
 */
export function inferTaskCategory(agentType: string): TaskCategory {
  const normalized = agentType.toLowerCase();

  // PR-related tasks
  if (normalized.includes('pitch') || normalized.includes('pr')) {
    return 'pr-pitch';
  }

  // Summarization tasks
  if (normalized.includes('summar') || normalized.includes('condense')) {
    return 'summarization';
  }

  // SEO tasks
  if (normalized.includes('seo') || normalized.includes('keyword')) {
    return 'seo-keywords';
  }

  // Analysis tasks
  if (
    normalized.includes('analy') ||
    normalized.includes('explain') ||
    normalized.includes('reason')
  ) {
    return 'analyst';
  }

  // JSON/structured tasks
  if (normalized.includes('json') || normalized.includes('structured')) {
    return 'structured-json';
  }

  // Long-form content
  if (
    normalized.includes('article') ||
    normalized.includes('blog') ||
    normalized.includes('content')
  ) {
    return 'drafting-long';
  }

  // Default to short-form drafting
  return 'drafting-short';
}

/**
 * Get all available task categories
 */
export function getAllTaskCategories(): TaskCategory[] {
  return Object.keys(TASK_CATALOG) as TaskCategory[];
}

/**
 * Validate task category
 */
export function isValidTaskCategory(category: string): category is TaskCategory {
  return category in TASK_CATALOG;
}
