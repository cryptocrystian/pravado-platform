"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryScoring = exports.MemoryScoring = void 0;
exports.calculateMemoryImportance = calculateMemoryImportance;
const logger_1 = require("../lib/logger");
const DEFAULT_CONFIG = {
    baseSentimentWeight: 0.3,
    entityCountWeight: 0.25,
    taskSuccessWeight: 0.35,
    recencyDecay: 0.1,
};
class MemoryScoring {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    calculateImportance(factors) {
        let score = 0;
        if (factors.sentimentScore !== undefined) {
            const sentimentIntensity = Math.abs(factors.sentimentScore);
            score += sentimentIntensity * this.config.baseSentimentWeight;
        }
        if (factors.entityCount !== undefined) {
            const normalizedEntityCount = Math.min(factors.entityCount / 10, 1);
            score += normalizedEntityCount * this.config.entityCountWeight;
        }
        if (factors.taskSuccess !== undefined) {
            const taskScore = factors.taskSuccess ? 1 : 0.3;
            score += taskScore * this.config.taskSuccessWeight;
        }
        const typeScore = this.getMemoryTypeBaseScore(factors.memoryType);
        score += typeScore * 0.1;
        if (factors.ageInDays !== undefined) {
            const recencyMultiplier = this.calculateRecencyMultiplier(factors.ageInDays);
            score = score * recencyMultiplier;
        }
        return Math.max(0, Math.min(1, score));
    }
    estimateSentimentScore(text) {
        const positiveWords = ['success', 'achieved', 'excellent', 'great', 'good', 'positive', 'win', 'accomplished'];
        const negativeWords = ['failed', 'error', 'bad', 'negative', 'wrong', 'issue', 'problem', 'failure'];
        const lowerText = text.toLowerCase();
        let positiveCount = 0;
        let negativeCount = 0;
        positiveWords.forEach(word => {
            if (lowerText.includes(word))
                positiveCount++;
        });
        negativeWords.forEach(word => {
            if (lowerText.includes(word))
                negativeCount++;
        });
        const total = positiveCount + negativeCount;
        if (total === 0)
            return 0;
        return (positiveCount - negativeCount) / total;
    }
    estimateEntityCount(text) {
        const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
        const uniqueEntities = new Set(capitalizedWords);
        return uniqueEntities.size;
    }
    getMemoryTypeBaseScore(memoryType) {
        if (!memoryType)
            return 0.5;
        switch (memoryType) {
            case 'REFLECTION':
                return 0.9;
            case 'FACT':
                return 0.8;
            case 'TASK':
                return 0.7;
            case 'SUMMARY':
                return 0.6;
            case 'CONVERSATION':
                return 0.5;
            default:
                return 0.5;
        }
    }
    calculateRecencyMultiplier(ageInDays) {
        const decay = this.config.recencyDecay;
        const multiplier = Math.exp(-decay * (ageInDays / 30));
        return Math.max(0.5, multiplier);
    }
    boostImportance(currentScore, boostFactors) {
        let boostedScore = currentScore;
        if (boostFactors.isUserMentioned) {
            boostedScore += 0.1;
        }
        if (boostFactors.hasExplicitFeedback) {
            boostedScore += 0.15;
        }
        if (boostFactors.isPartOfChain) {
            boostedScore += 0.05;
        }
        return Math.min(1, boostedScore);
    }
    autoCalculateImportance(content, memoryType, additionalFactors = {}) {
        const sentimentScore = this.estimateSentimentScore(content);
        const entityCount = this.estimateEntityCount(content);
        return this.calculateImportance({
            sentimentScore,
            entityCount,
            memoryType,
            ...additionalFactors,
        });
    }
    decayScore(currentScore, ageInDays) {
        const recencyMultiplier = this.calculateRecencyMultiplier(ageInDays);
        return currentScore * recencyMultiplier;
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        logger_1.logger.info('Memory scoring configuration updated', this.config);
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.MemoryScoring = MemoryScoring;
exports.memoryScoring = new MemoryScoring();
function calculateMemoryImportance(content, memoryType, additionalFactors) {
    return exports.memoryScoring.autoCalculateImportance(content, memoryType, additionalFactors);
}
//# sourceMappingURL=memory-scoring.js.map