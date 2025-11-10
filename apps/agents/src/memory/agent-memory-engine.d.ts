import { EventEmitter } from 'events';
import type { MemoryEpisode, MemoryChunk, MemoryEpisodeWithDetails, MemorySearchResult, MemoryTimeline, MemoryDashboard, GptMemorySummary, GptMemoryCompression, MemoryContextForAgent, MemoryInjectionPrompt, StoreMemoryEpisodeInput, UpdateMemoryEpisodeInput, EmbedMemoryChunksInput, LinkMemoryReferencesInput, SearchMemoryInput, GetMemoryEpisodesInput, GetMemoryTimelineInput, GetMemoryDashboardInput, SummarizeMemoryInput, CompressMemoryInput, LogMemoryEventInput } from '@pravado/types';
declare class AgentMemoryEngine extends EventEmitter {
    storeEpisode(input: StoreMemoryEpisodeInput): Promise<string>;
    private generateEmbedding;
    embedEpisodeChunks(input: EmbedMemoryChunksInput): Promise<MemoryChunk[]>;
    private splitIntoChunks;
    linkReferences(input: LinkMemoryReferencesInput): Promise<string>;
    retrieveRelevantEpisodes(input: SearchMemoryInput): Promise<MemorySearchResult[]>;
    searchMemory(input: SearchMemoryInput): Promise<MemorySearchResult[]>;
    getMemoryEpisodes(input: GetMemoryEpisodesInput): Promise<{
        episodes: MemoryEpisode[];
        total: number;
    }>;
    getEpisodeById(organizationId: string, episodeId: string): Promise<MemoryEpisodeWithDetails>;
    summarizeEpisode(input: SummarizeMemoryInput): Promise<GptMemorySummary>;
    compressMemories(input: CompressMemoryInput): Promise<GptMemoryCompression>;
    getMemoryContext(organizationId: string, query: string, agentId?: string, threadId?: string, limit?: number): Promise<MemoryContextForAgent>;
    injectMemoryPrompt(organizationId: string, query: string, agentId?: string, threadId?: string): Promise<MemoryInjectionPrompt>;
    updateEpisode(input: UpdateMemoryEpisodeInput): Promise<MemoryEpisode>;
    logMemoryEvent(input: LogMemoryEventInput): Promise<string>;
    getMemoryTimeline(input: GetMemoryTimelineInput): Promise<MemoryTimeline>;
    getMemoryDashboard(input: GetMemoryDashboardInput): Promise<MemoryDashboard>;
}
export declare const agentMemoryEngine: AgentMemoryEngine;
export {};
//# sourceMappingURL=agent-memory-engine.d.ts.map