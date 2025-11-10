import type { AgentMemory, CreateAgentMemoryInput, AgentMemorySearchParams, MemorySearchResult, MemoryStats, MemoryType, PruneMemoriesParams, PruneMemoriesResult } from '@pravado/types';
export declare class MemoryStore {
    addMemory(input: CreateAgentMemoryInput): Promise<AgentMemory>;
    searchMemory(params: AgentMemorySearchParams): Promise<MemorySearchResult>;
    getRecentMemories(agentId: string, organizationId: string, limit?: number, memoryTypes?: MemoryType[]): Promise<AgentMemory[]>;
    getMemoryById(id: string, organizationId: string): Promise<AgentMemory | null>;
    getMemoryStats(agentId: string, organizationId: string): Promise<MemoryStats>;
    pruneMemories(params: PruneMemoriesParams): Promise<PruneMemoriesResult>;
    deleteMemory(id: string, organizationId: string): Promise<boolean>;
    private mapToAgentMemory;
}
export declare const memoryStore: MemoryStore;
//# sourceMappingURL=memory-store.d.ts.map