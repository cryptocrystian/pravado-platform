// =====================================================
// AGENT MEMORY CONTROLLER
// Sprint 36: Long-term agent memory and contextual recall
// =====================================================

import { Request, Response } from 'express';
import { agentMemoryEngine } from '../../../agents/src/memory/agent-memory-engine';
import type {
  StoreMemoryEpisodeInput,
  UpdateMemoryEpisodeInput,
  EmbedMemoryChunksInput,
  LinkMemoryReferencesInput,
  SearchMemoryInput,
  GetMemoryEpisodesInput,
  GetMemoryTimelineInput,
  GetMemoryDashboardInput,
  SummarizeMemoryInput,
  CompressMemoryInput,
  LogMemoryEventInput,
} from '@pravado/types';

// =====================================================
// MEMORY EPISODE ENDPOINTS
// =====================================================

/**
 * Store memory episode
 * POST /api/v1/agent-memory/episodes
 */
export async function storeEpisode(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: StoreMemoryEpisodeInput = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const episodeId = await agentMemoryEngine.storeEpisode(input);

    res.json({ success: true, episodeId });
  } catch (error: any) {
    console.error('Store episode error:', error);
    res.status(500).json({ error: error.message || 'Failed to store episode' });
  }
}

/**
 * Update memory episode
 * PUT /api/v1/agent-memory/episodes/:episodeId
 */
export async function updateEpisode(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateMemoryEpisodeInput = {
      ...req.body,
      episodeId,
    };

    const episode = await agentMemoryEngine.updateEpisode(input);

    res.json({ success: true, episode });
  } catch (error: any) {
    console.error('Update episode error:', error);
    res.status(500).json({ error: error.message || 'Failed to update episode' });
  }
}

/**
 * Get memory episodes
 * GET /api/v1/agent-memory/episodes
 */
export async function getEpisodes(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const {
      memoryType,
      status,
      agentId,
      threadId,
      sessionId,
      minImportance,
      maxImportance,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetMemoryEpisodesInput = {
      organizationId,
      memoryType: memoryType as any,
      status: status as any,
      agentId: agentId as string | undefined,
      threadId: threadId as string | undefined,
      sessionId: sessionId as string | undefined,
      minImportance: minImportance ? parseFloat(minImportance as string) : undefined,
      maxImportance: maxImportance ? parseFloat(maxImportance as string) : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await agentMemoryEngine.getMemoryEpisodes(input);

    res.json({ success: true, episodes: result.episodes, total: result.total });
  } catch (error: any) {
    console.error('Get episodes error:', error);
    res.status(500).json({ error: error.message || 'Failed to get episodes' });
  }
}

/**
 * Get memory episode by ID
 * GET /api/v1/agent-memory/episodes/:episodeId
 */
export async function getEpisodeById(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const episode = await agentMemoryEngine.getEpisodeById(organizationId, episodeId);

    res.json({ success: true, episode });
  } catch (error: any) {
    console.error('Get episode error:', error);
    res.status(500).json({ error: error.message || 'Failed to get episode' });
  }
}

// =====================================================
// MEMORY OPERATIONS ENDPOINTS
// =====================================================

/**
 * Embed memory chunks
 * POST /api/v1/agent-memory/episodes/:episodeId/embed
 */
export async function embedChunks(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;
    const { chunkSize, overlapSize } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: EmbedMemoryChunksInput = {
      episodeId,
      chunkSize,
      overlapSize,
    };

    const chunks = await agentMemoryEngine.embedEpisodeChunks(input);

    res.json({ success: true, chunks });
  } catch (error: any) {
    console.error('Embed chunks error:', error);
    res.status(500).json({ error: error.message || 'Failed to embed chunks' });
  }
}

/**
 * Link memory references
 * POST /api/v1/agent-memory/episodes/:episodeId/link
 */
export async function linkReferences(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LinkMemoryReferencesInput = {
      ...req.body,
      episodeId,
    };

    const linkId = await agentMemoryEngine.linkReferences(input);

    res.json({ success: true, linkId });
  } catch (error: any) {
    console.error('Link references error:', error);
    res.status(500).json({ error: error.message || 'Failed to link references' });
  }
}

/**
 * Log memory event
 * POST /api/v1/agent-memory/episodes/:episodeId/events
 */
export async function logEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LogMemoryEventInput = {
      ...req.body,
      episodeId,
      triggeredBy: userId,
    };

    const eventId = await agentMemoryEngine.logMemoryEvent(input);

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Log event error:', error);
    res.status(500).json({ error: error.message || 'Failed to log event' });
  }
}

// =====================================================
// SEARCH & RECALL ENDPOINTS
// =====================================================

/**
 * Search memory
 * POST /api/v1/agent-memory/search
 */
export async function searchMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SearchMemoryInput = {
      ...req.body,
      organizationId,
    };

    const results = await agentMemoryEngine.searchMemory(input);

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Search memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to search memory' });
  }
}

/**
 * Get memory context for agent
 * POST /api/v1/agent-memory/context
 */
export async function getMemoryContext(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { query, agentId, threadId, limit } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const context = await agentMemoryEngine.getMemoryContext(
      organizationId,
      query,
      agentId,
      threadId,
      limit
    );

    res.json({ success: true, context });
  } catch (error: any) {
    console.error('Get memory context error:', error);
    res.status(500).json({ error: error.message || 'Failed to get memory context' });
  }
}

/**
 * Inject memory into prompt
 * POST /api/v1/agent-memory/inject-prompt
 */
export async function injectPrompt(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { query, agentId, threadId } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const prompt = await agentMemoryEngine.injectMemoryPrompt(
      organizationId,
      query,
      agentId,
      threadId
    );

    res.json({ success: true, prompt });
  } catch (error: any) {
    console.error('Inject prompt error:', error);
    res.status(500).json({ error: error.message || 'Failed to inject prompt' });
  }
}

// =====================================================
// AI OPERATIONS ENDPOINTS
// =====================================================

/**
 * Summarize memory episode (GPT-4)
 * POST /api/v1/agent-memory/episodes/:episodeId/summarize
 */
export async function summarizeEpisode(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeMemoryInput = {
      organizationId,
      episodeId,
    };

    const summary = await agentMemoryEngine.summarizeEpisode(input);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize episode error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize episode' });
  }
}

/**
 * Compress memories (GPT-4)
 * POST /api/v1/agent-memory/compress
 */
export async function compressMemories(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeIds } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CompressMemoryInput = {
      organizationId,
      episodeIds,
    };

    const compression = await agentMemoryEngine.compressMemories(input);

    res.json({ success: true, compression });
  } catch (error: any) {
    console.error('Compress memories error:', error);
    res.status(500).json({ error: error.message || 'Failed to compress memories' });
  }
}

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * Get memory timeline
 * GET /api/v1/agent-memory/timeline
 */
export async function getTimeline(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { threadId, agentId, startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetMemoryTimelineInput = {
      organizationId,
      threadId: threadId as string | undefined,
      agentId: agentId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };

    const timeline = await agentMemoryEngine.getMemoryTimeline(input);

    res.json({ success: true, timeline });
  } catch (error: any) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get timeline' });
  }
}

/**
 * Get memory dashboard
 * GET /api/v1/agent-memory/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { agentId, periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetMemoryDashboardInput = {
      organizationId,
      agentId: agentId as string | undefined,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
    };

    const dashboard = await agentMemoryEngine.getMemoryDashboard(input);

    res.json({ success: true, dashboard });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard' });
  }
}
