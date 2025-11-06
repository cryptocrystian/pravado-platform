import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  StoreMemoryInput,
  QueryMemoriesInput,
  InsertKGNodeInput,
  LinkKGNodesInput,
  MemorySearchRequest,
  MemorySearchResult,
  CampaignMemoryContext,
  CampaignKnowledgeGraph,
  ContextInjectionInput,
  ContextInjectionResult,
} from '@pravado/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =====================================================
// MEMORY MUTATIONS
// =====================================================

/**
 * Store memory
 */
export function useStoreMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<StoreMemoryInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/memory/store`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to store memory');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] });
    },
  });
}

/**
 * Query memories (requires embedding)
 */
export function useQueryMemories() {
  return useMutation({
    mutationFn: async (input: Omit<QueryMemoriesInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/memory/query`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to query memories');
      }
      return res.json();
    },
  });
}

/**
 * Search memories by text query (no embedding needed)
 */
export function useSearchMemories() {
  return useMutation({
    mutationFn: async (request: Omit<MemorySearchRequest, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/memory/search`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to search memories');
      }
      return res.json() as Promise<MemorySearchResult>;
    },
  });
}

/**
 * Inject context for planning/execution
 */
export function useInjectContext() {
  return useMutation({
    mutationFn: async (input: Omit<ContextInjectionInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/memory/inject-context`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to inject context');
      }
      return res.json() as Promise<ContextInjectionResult>;
    },
  });
}

// =====================================================
// MEMORY QUERIES
// =====================================================

/**
 * Get campaign memory context
 */
export function useCampaignMemory(campaignId: string | null, limit: number = 20) {
  return useQuery<CampaignMemoryContext>({
    queryKey: ['memory', 'campaign', campaignId, limit],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await fetch(
        `${API_BASE}/memory/campaign/${campaignId}?limit=${limit}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch campaign memory');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// KNOWLEDGE GRAPH MUTATIONS
// =====================================================

/**
 * Insert knowledge graph node
 */
export function useInsertGraphNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<InsertKGNodeInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/knowledge-graph/node`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to insert knowledge graph node');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-graph', variables.campaignId],
      });
    },
  });
}

/**
 * Link knowledge graph nodes
 */
export function useLinkGraphNodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<LinkKGNodesInput, 'organizationId'>) => {
      const res = await fetch(`${API_BASE}/knowledge-graph/link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to link knowledge graph nodes');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-graph', variables.campaignId],
      });
    },
  });
}

// =====================================================
// KNOWLEDGE GRAPH QUERIES
// =====================================================

/**
 * Get campaign knowledge graph
 */
export function useCampaignKnowledgeGraph(
  campaignId: string | null,
  options?: {
    nodeTypes?: string[];
    minImportance?: number;
  }
) {
  return useQuery<{ success: boolean; graph: CampaignKnowledgeGraph }>({
    queryKey: ['knowledge-graph', campaignId, options],
    queryFn: async () => {
      if (!campaignId) return null;

      const params = new URLSearchParams();
      if (options?.nodeTypes && options.nodeTypes.length > 0) {
        params.append('nodeTypes', options.nodeTypes.join(','));
      }
      if (options?.minImportance !== undefined) {
        params.append('minImportance', String(options.minImportance));
      }

      const res = await fetch(
        `${API_BASE}/knowledge-graph/${campaignId}${params.toString() ? '?' + params.toString() : ''}`,
        {
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to fetch knowledge graph');
      return res.json();
    },
    enabled: !!campaignId,
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get memory statistics
 */
export function useMemoryStats(campaignId: string | null) {
  const { data: context } = useCampaignMemory(campaignId);

  if (!context) return null;

  const memoryByType = context.memories.reduce((acc, memory) => {
    acc[memory.memoryType] = (acc[memory.memoryType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgImportance =
    context.memories.length > 0
      ? context.memories.reduce((sum, m) => sum + m.importanceScore, 0) /
        context.memories.length
      : 0;

  return {
    totalMemories: context.count,
    memoryByType,
    avgImportance,
    recentMemories: context.memories.slice(0, 5),
  };
}

/**
 * Get knowledge graph statistics
 */
export function useKnowledgeGraphStats(campaignId: string | null) {
  const { data } = useCampaignKnowledgeGraph(campaignId);

  if (!data?.graph) return null;

  const { graph } = data;

  const nodesByType = graph.nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const edgesByType = graph.edges.reduce((acc, edge) => {
    acc[edge.type] = (acc[edge.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgNodeImportance =
    graph.nodes.length > 0
      ? graph.nodes.reduce((sum, n) => sum + n.importance, 0) / graph.nodes.length
      : 0;

  // Find central nodes (most connections)
  const nodeConnections = new Map<string, number>();
  graph.edges.forEach((edge) => {
    nodeConnections.set(edge.from, (nodeConnections.get(edge.from) || 0) + 1);
    nodeConnections.set(edge.to, (nodeConnections.get(edge.to) || 0) + 1);
  });

  const centralNodes = graph.nodes
    .map((node) => ({
      nodeId: node.nodeId,
      label: node.label,
      connections: nodeConnections.get(node.nodeId) || 0,
      importance: node.importance,
    }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodesByType,
    edgesByType,
    avgNodeImportance,
    centralNodes,
  };
}

/**
 * Get memory type color
 */
export function useMemoryTypeColor(type: string | null) {
  const colorMap = {
    PLANNING: 'blue',
    INSIGHT: 'purple',
    ERROR: 'red',
    SUCCESS: 'green',
    STRATEGY: 'indigo',
    LEARNING: 'cyan',
    DECISION: 'orange',
    OUTCOME: 'teal',
  };

  return colorMap[type as keyof typeof colorMap] || 'gray';
}

/**
 * Get node type color
 */
export function useNodeTypeColor(type: string | null) {
  const colorMap = {
    CAMPAIGN: 'blue',
    CONTACT: 'green',
    TOPIC: 'purple',
    MESSAGE: 'cyan',
    OUTCOME: 'teal',
    DECISION: 'orange',
    INSIGHT: 'indigo',
    PATTERN: 'pink',
    STRATEGY: 'violet',
  };

  return colorMap[type as keyof typeof colorMap] || 'gray';
}
