import type { ImportanceScoringConfig, MemoryType } from '@pravado/types';
export interface MemoryImportanceFactors {
    sentimentScore?: number;
    entityCount?: number;
    taskSuccess?: boolean;
    memoryType?: MemoryType;
    ageInDays?: number;
}
export declare class MemoryScoring {
    private config;
    constructor(config?: Partial<ImportanceScoringConfig>);
    calculateImportance(factors: MemoryImportanceFactors): number;
    estimateSentimentScore(text: string): number;
    estimateEntityCount(text: string): number;
    private getMemoryTypeBaseScore;
    private calculateRecencyMultiplier;
    boostImportance(currentScore: number, boostFactors: {
        isUserMentioned?: boolean;
        hasExplicitFeedback?: boolean;
        isPartOfChain?: boolean;
    }): number;
    autoCalculateImportance(content: string, memoryType: MemoryType, additionalFactors?: Partial<MemoryImportanceFactors>): number;
    decayScore(currentScore: number, ageInDays: number): number;
    updateConfig(config: Partial<ImportanceScoringConfig>): void;
    getConfig(): ImportanceScoringConfig;
}
export declare const memoryScoring: MemoryScoring;
export declare function calculateMemoryImportance(content: string, memoryType: MemoryType, additionalFactors?: Partial<MemoryImportanceFactors>): number;
//# sourceMappingURL=memory-scoring.d.ts.map