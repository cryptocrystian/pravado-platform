import type { AgentMemorySnapshot, GenerateSnapshotParams } from '@pravado/types';
export declare class MemorySummarizer {
    generateSnapshot(params: GenerateSnapshotParams): Promise<AgentMemorySnapshot>;
    getSnapshots(agentId: string, organizationId: string, limit?: number): Promise<AgentMemorySnapshot[]>;
    summarizeDailyMemories(agentId: string, organizationId: string, date: Date): Promise<AgentMemorySnapshot>;
    summarizeWeeklyMemories(agentId: string, organizationId: string, weekStartDate: Date): Promise<AgentMemorySnapshot>;
    private getMemoriesInTimeWindow;
    private summarizeMemories;
    private mapToSnapshot;
}
export declare const memorySummarizer: MemorySummarizer;
//# sourceMappingURL=memory-summarizer.d.ts.map