import type { AgentMemory, StoreMemoryInput, QueryMemoriesInput, MemoryQueryResult, CampaignMemoryContext, InsertKGNodeInput, LinkKGNodesInput, CampaignKnowledgeGraph, KGNodeType, MemorySummaryRequest, MemorySummaryResult, ContextInjectionInput, ContextInjectionResult } from '@pravado/types';
export declare class MemoryEngine {
    storeMemory(input: StoreMemoryInput): Promise<string>;
    getRelevantMemories(input: QueryMemoriesInput): Promise<MemoryQueryResult[]>;
    loadCampaignContext(campaignId: string, organizationId: string, limit?: number): Promise<CampaignMemoryContext>;
    summarizeMemories(request: MemorySummaryRequest): Promise<MemorySummaryResult>;
    insertKGNode(input: InsertKGNodeInput): Promise<string>;
    linkKGNodes(input: LinkKGNodesInput): Promise<string>;
    getKnowledgeGraphContext(campaignId: string, organizationId: string, nodeTypes?: KGNodeType[], minImportance?: number): Promise<CampaignKnowledgeGraph>;
    injectContext(input: ContextInjectionInput): Promise<ContextInjectionResult>;
    private generateEmbedding;
    private generateSummary;
    private buildContextPrompt;
    linkToKnowledgeGraph(memory: AgentMemory, organizationId: string): Promise<void>;
    private extractEntities;
}
export declare const memoryEngine: MemoryEngine;
//# sourceMappingURL=memory-engine.d.ts.map