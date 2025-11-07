// =====================================================
// MEMORY CONTROLLER - AI Memory & Strategy API
// =====================================================

import { Request, Response } from 'express';
import { memoryEngine } from '../../../agents/src/memory/memory-engine';
import type {
  StoreMemoryInput,
  QueryMemoriesInput,
  InsertKGNodeInput,
  LinkKGNodesInput,
  MemorySearchRequest,
  KGNodeType,
} from '@pravado/types';

/**
 * Store memory manually
 * POST /api/v1/memory/store
 */
export async function storeMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: StoreMemoryInput = {
      ...req.body,
      organizationId,
    };

    const memoryId = await memoryEngine.storeMemory(input);

    res.json({
      success: true,
      memoryId,
    });
  } catch (error: any) {
    console.error('storeMemory error:', error);
    res.status(500).json({
      error: error.message || 'Failed to store memory',
    });
  }
}

/**
 * Query memories using semantic search
 * POST /api/v1/memory/query
 */
export async function queryMemories(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: QueryMemoriesInput = {
      ...req.body,
      organizationId,
    };

    const memories = await memoryEngine.getRelevantMemories(input);

    res.json({
      success: true,
      memories,
      count: memories.length,
    });
  } catch (error: any) {
    console.error('queryMemories error:', error);
    res.status(500).json({
      error: error.message || 'Failed to query memories',
    });
  }
}

/**
 * Get campaign memory context
 * GET /api/v1/memory/campaign/:campaignId
 */
export async function getCampaignMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const context = await memoryEngine.loadCampaignContext(
      campaignId,
      organizationId,
      limit
    );

    res.json({
      success: true,
      ...context,
    });
  } catch (error: any) {
    console.error('getCampaignMemory error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get campaign memory',
    });
  }
}

/**
 * Search memories by text query
 * POST /api/v1/memory/search
 */
export async function searchMemories(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: MemorySearchRequest = {
      ...req.body,
      organizationId,
    };

    // Generate embedding for query
    const embedding = await (memoryEngine as any).generateEmbedding(request.query);

    // Query memories
    const memories = await memoryEngine.getRelevantMemories({
      queryEmbedding: embedding,
      organizationId,
      agentType: request.agentType,
      campaignId: request.campaignId,
      memoryTypes: request.memoryTypes,
      limit: request.limit || 20,
      minSimilarity: 0.6,
    });

    res.json({
      success: true,
      results: memories,
      count: memories.length,
      query: request.query,
    });
  } catch (error: any) {
    console.error('searchMemories error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search memories',
    });
  }
}

/**
 * Insert knowledge graph node
 * POST /api/v1/knowledge-graph/node
 */
export async function insertKGNode(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: InsertKGNodeInput = {
      ...req.body,
      organizationId,
    };

    const nodeId = await memoryEngine.insertKGNode(input);

    res.json({
      success: true,
      nodeId,
    });
  } catch (error: any) {
    console.error('insertKGNode error:', error);
    res.status(500).json({
      error: error.message || 'Failed to insert knowledge graph node',
    });
  }
}

/**
 * Link knowledge graph nodes
 * POST /api/v1/knowledge-graph/link
 */
export async function linkKGNodes(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: LinkKGNodesInput = {
      ...req.body,
      organizationId,
    };

    const edgeId = await memoryEngine.linkKGNodes(input);

    res.json({
      success: true,
      edgeId,
    });
  } catch (error: any) {
    console.error('linkKGNodes error:', error);
    res.status(500).json({
      error: error.message || 'Failed to link knowledge graph nodes',
    });
  }
}

/**
 * Get campaign knowledge graph
 * GET /api/v1/knowledge-graph/:campaignId
 */
export async function getCampaignKnowledgeGraph(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const nodeTypes = req.query.nodeTypes
      ? (req.query.nodeTypes as string).split(',') as KGNodeType[]
      : undefined;
    const minImportance = req.query.minImportance
      ? parseFloat(req.query.minImportance as string)
      : 0.5;

    const graph = await memoryEngine.getKnowledgeGraphContext(
      campaignId,
      organizationId,
      nodeTypes,
      minImportance
    );

    res.json({
      success: true,
      graph,
    });
  } catch (error: any) {
    console.error('getCampaignKnowledgeGraph error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get campaign knowledge graph',
    });
  }
}

/**
 * Inject context for planning/execution
 * POST /api/v1/memory/inject-context
 */
export async function injectContext(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input = {
      ...req.body,
      organizationId,
    };

    const context = await memoryEngine.injectContext(input);

    res.json({
      success: true,
      ...context,
    });
  } catch (error: any) {
    console.error('injectContext error:', error);
    res.status(500).json({
      error: error.message || 'Failed to inject context',
    });
  }
}
