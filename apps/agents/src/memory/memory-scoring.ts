// =====================================================
// AGENT MEMORY IMPORTANCE SCORING
// =====================================================
// Calculate importance scores for memories based on multiple factors

import type { ImportanceScoringConfig, MemoryType } from '@pravado/types';
import { logger } from '../../../api/src/lib/logger';

/**
 * Default scoring configuration
 */
const DEFAULT_CONFIG: ImportanceScoringConfig = {
  baseSentimentWeight: 0.3,
  entityCountWeight: 0.25,
  taskSuccessWeight: 0.35,
  recencyDecay: 0.1,
};

/**
 * Factors for calculating memory importance
 */
export interface MemoryImportanceFactors {
  sentimentScore?: number; // -1 to 1, emotional intensity
  entityCount?: number; // Number of named entities
  taskSuccess?: boolean; // Whether associated task succeeded
  memoryType?: MemoryType;
  ageInDays?: number; // Age of memory in days
}

/**
 * Memory Scoring System
 */
export class MemoryScoring {
  private config: ImportanceScoringConfig;

  constructor(config: Partial<ImportanceScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate importance score for a memory
   * Returns a value between 0 and 1
   */
  calculateImportance(factors: MemoryImportanceFactors): number {
    let score = 0;

    // Sentiment contribution (emotional content is important)
    if (factors.sentimentScore !== undefined) {
      const sentimentIntensity = Math.abs(factors.sentimentScore); // 0-1
      score += sentimentIntensity * this.config.baseSentimentWeight;
    }

    // Entity count contribution (rich context is important)
    if (factors.entityCount !== undefined) {
      const normalizedEntityCount = Math.min(factors.entityCount / 10, 1); // Cap at 10 entities
      score += normalizedEntityCount * this.config.entityCountWeight;
    }

    // Task success contribution (outcomes are important)
    if (factors.taskSuccess !== undefined) {
      const taskScore = factors.taskSuccess ? 1 : 0.3; // Failures still have some importance
      score += taskScore * this.config.taskSuccessWeight;
    }

    // Memory type base score
    const typeScore = this.getMemoryTypeBaseScore(factors.memoryType);
    score += typeScore * 0.1; // 10% weight for type

    // Apply recency decay
    if (factors.ageInDays !== undefined) {
      const recencyMultiplier = this.calculateRecencyMultiplier(factors.ageInDays);
      score = score * recencyMultiplier;
    }

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate sentiment score from text (simplified)
   * In production, this would use NLP analysis
   */
  estimateSentimentScore(text: string): number {
    const positiveWords = ['success', 'achieved', 'excellent', 'great', 'good', 'positive', 'win', 'accomplished'];
    const negativeWords = ['failed', 'error', 'bad', 'negative', 'wrong', 'issue', 'problem', 'failure'];

    const lowerText = text.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
  }

  /**
   * Count named entities in text (simplified)
   * In production, this would use NER (Named Entity Recognition)
   */
  estimateEntityCount(text: string): number {
    // Simple heuristic: count capitalized words
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];

    // Deduplicate
    const uniqueEntities = new Set(capitalizedWords);

    return uniqueEntities.size;
  }

  /**
   * Get base importance score for memory type
   */
  private getMemoryTypeBaseScore(memoryType?: MemoryType): number {
    if (!memoryType) return 0.5;

    switch (memoryType) {
      case 'REFLECTION':
        return 0.9; // Reflections are high value
      case 'FACT':
        return 0.8; // Facts are important
      case 'TASK':
        return 0.7; // Task records are valuable
      case 'SUMMARY':
        return 0.6; // Summaries are useful
      case 'CONVERSATION':
        return 0.5; // Conversations are baseline
      default:
        return 0.5;
    }
  }

  /**
   * Calculate recency multiplier based on age
   * More recent memories get higher scores
   */
  private calculateRecencyMultiplier(ageInDays: number): number {
    // Exponential decay: multiplier = e^(-decay * days)
    const decay = this.config.recencyDecay;
    const multiplier = Math.exp(-decay * (ageInDays / 30)); // Normalize to months

    // Ensure minimum multiplier of 0.5 (old memories still have value)
    return Math.max(0.5, multiplier);
  }

  /**
   * Boost importance score for specific contexts
   */
  boostImportance(
    currentScore: number,
    boostFactors: {
      isUserMentioned?: boolean;
      hasExplicitFeedback?: boolean;
      isPartOfChain?: boolean;
    }
  ): number {
    let boostedScore = currentScore;

    if (boostFactors.isUserMentioned) {
      boostedScore += 0.1; // User mentions are important
    }

    if (boostFactors.hasExplicitFeedback) {
      boostedScore += 0.15; // User feedback is very important
    }

    if (boostFactors.isPartOfChain) {
      boostedScore += 0.05; // Context chains are valuable
    }

    return Math.min(1, boostedScore);
  }

  /**
   * Calculate importance from memory content automatically
   */
  autoCalculateImportance(
    content: string,
    memoryType: MemoryType,
    additionalFactors: Partial<MemoryImportanceFactors> = {}
  ): number {
    const sentimentScore = this.estimateSentimentScore(content);
    const entityCount = this.estimateEntityCount(content);

    return this.calculateImportance({
      sentimentScore,
      entityCount,
      memoryType,
      ...additionalFactors,
    });
  }

  /**
   * Decay importance scores over time (for batch updates)
   */
  decayScore(currentScore: number, ageInDays: number): number {
    const recencyMultiplier = this.calculateRecencyMultiplier(ageInDays);
    return currentScore * recencyMultiplier;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ImportanceScoringConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Memory scoring configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ImportanceScoringConfig {
    return { ...this.config };
  }
}

// Export singleton instance with default config
export const memoryScoring = new MemoryScoring();

/**
 * Helper function to quickly calculate importance
 */
export function calculateMemoryImportance(
  content: string,
  memoryType: MemoryType,
  additionalFactors?: Partial<MemoryImportanceFactors>
): number {
  return memoryScoring.autoCalculateImportance(content, memoryType, additionalFactors);
}
