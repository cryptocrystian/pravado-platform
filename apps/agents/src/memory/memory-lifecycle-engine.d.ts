import type { AgeMemoryInput, AgeMemoryResult, CompressMemoryInput, CompressMemoryResult, PruneMemoryInput, PruneMemoryResult, ArchiveMemoryInput, ArchiveMemoryResult, MarkForArchivalInput, RecommendArchivalInput, AssessImportanceInput, GetRetentionPlanInput, ReinforceMemoryInput, GetLifecycleDashboardInput, MemoryRetentionPlan, MemoryLifecycleDashboard, MemoryArchivalRecommendation, MemoryImportanceAssessment, MemoryAgingMetrics } from '@pravado/types';
declare class MemoryLifecycleEngine {
    ageMemoryEpisodes(input: AgeMemoryInput): Promise<AgeMemoryResult>;
    reinforceMemory(input: ReinforceMemoryInput): Promise<void>;
    getAgingMetrics(episodeId: string): Promise<MemoryAgingMetrics>;
    compressOldMemory(input: CompressMemoryInput): Promise<CompressMemoryResult>;
    private generateCompressionSummary;
    pruneExpiredMemory(input: PruneMemoryInput): Promise<PruneMemoryResult>;
    archiveMemoryEpisodes(input: ArchiveMemoryInput): Promise<ArchiveMemoryResult>;
    markForArchival(input: MarkForArchivalInput): Promise<void>;
    getMemoryRetentionPlan(input: GetRetentionPlanInput): Promise<MemoryRetentionPlan>;
    recommendArchivalCandidates(input: RecommendArchivalInput): Promise<MemoryArchivalRecommendation[]>;
    private assessArchivalCandidate;
    assessMemoryImportance(input: AssessImportanceInput): Promise<MemoryImportanceAssessment>;
    getLifecycleDashboard(input: GetLifecycleDashboardInput): Promise<MemoryLifecycleDashboard>;
    private calculateHealthScore;
    private logLifecycleEvent;
}
export declare const memoryLifecycleEngine: MemoryLifecycleEngine;
export {};
//# sourceMappingURL=memory-lifecycle-engine.d.ts.map