// =====================================================
// AGENT MEMORY LIFECYCLE CONTROLLER
// Sprint 37: Autonomous memory pruning, aging, and lifespan management
// =====================================================

import { Request, Response } from 'express';
import { memoryLifecycleEngine } from '../../../agents/src/memory/memory-lifecycle-engine';
import type {
  AgeMemoryInput,
  CompressMemoryInput,
  PruneMemoryInput,
  ArchiveMemoryInput,
  MarkForArchivalInput,
  RecommendArchivalInput,
  AssessImportanceInput,
  GetRetentionPlanInput,
  ReinforceMemoryInput,
  GetLifecycleDashboardInput,
} from '@pravado/shared-types';

// =====================================================
// AGING ENDPOINTS
// =====================================================

/**
 * Age memory episodes
 * POST /api/v1/agent-memory-lifecycle/age
 */
export async function ageMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: AgeMemoryInput = {
      organizationId,
      daysSinceLastRun: req.body.daysSinceLastRun,
    };

    const result = await memoryLifecycleEngine.ageMemoryEpisodes(input);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Age memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to age memory' });
  }
}

/**
 * Reinforce memory episode
 * POST /api/v1/agent-memory-lifecycle/reinforce
 */
export async function reinforceMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId, reinforcementAmount } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ReinforceMemoryInput = {
      episodeId,
      reinforcementAmount,
    };

    await memoryLifecycleEngine.reinforceMemory(input);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Reinforce memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to reinforce memory' });
  }
}

/**
 * Get aging metrics for episode
 * GET /api/v1/agent-memory-lifecycle/aging-metrics/:episodeId
 */
export async function getAgingMetrics(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { episodeId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const metrics = await memoryLifecycleEngine.getAgingMetrics(episodeId);

    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Get aging metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get aging metrics' });
  }
}

// =====================================================
// COMPRESSION ENDPOINTS
// =====================================================

/**
 * Compress memory episode
 * POST /api/v1/agent-memory-lifecycle/compress
 */
export async function compressMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CompressMemoryInput = {
      episodeId: req.body.episodeId,
      preserveKeyPoints: req.body.preserveKeyPoints,
      targetCompressionRatio: req.body.targetCompressionRatio,
    };

    const result = await memoryLifecycleEngine.compressOldMemory(input);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Compress memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to compress memory' });
  }
}

// =====================================================
// PRUNING/ARCHIVAL ENDPOINTS
// =====================================================

/**
 * Prune memory episodes
 * POST /api/v1/agent-memory-lifecycle/prune
 */
export async function pruneMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: PruneMemoryInput = {
      organizationId,
      episodeIds: req.body.episodeIds,
      ageThreshold: req.body.ageThreshold,
      importanceThreshold: req.body.importanceThreshold,
      daysInactive: req.body.daysInactive,
      dryRun: req.body.dryRun,
    };

    const result = await memoryLifecycleEngine.pruneExpiredMemory(input);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Prune memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to prune memory' });
  }
}

/**
 * Archive memory episodes
 * POST /api/v1/agent-memory-lifecycle/archive
 */
export async function archiveMemory(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ArchiveMemoryInput = {
      episodeIds: req.body.episodeIds,
      reason: req.body.reason,
    };

    const result = await memoryLifecycleEngine.archiveMemoryEpisodes(input);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Archive memory error:', error);
    res.status(500).json({ error: error.message || 'Failed to archive memory' });
  }
}

/**
 * Mark episode for archival
 * PUT /api/v1/agent-memory-lifecycle/mark-archival
 */
export async function markForArchival(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: MarkForArchivalInput = {
      episodeId: req.body.episodeId,
      expiresAt: req.body.expiresAt,
      reason: req.body.reason,
    };

    await memoryLifecycleEngine.markForArchival(input);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark for archival error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark for archival' });
  }
}

// =====================================================
// AI-POWERED ENDPOINTS
// =====================================================

/**
 * Recommend archival candidates (GPT-4)
 * POST /api/v1/agent-memory-lifecycle/recommend-archival
 */
export async function recommendArchival(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: RecommendArchivalInput = {
      organizationId,
      limit: req.body.limit,
      ageThreshold: req.body.ageThreshold,
      importanceThreshold: req.body.importanceThreshold,
    };

    const recommendations = await memoryLifecycleEngine.recommendArchivalCandidates(input);

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Recommend archival error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend archival' });
  }
}

/**
 * Assess memory importance (GPT-4)
 * POST /api/v1/agent-memory-lifecycle/assess-importance
 */
export async function assessImportance(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: AssessImportanceInput = {
      episodeId: req.body.episodeId,
      context: req.body.context,
    };

    const assessment = await memoryLifecycleEngine.assessMemoryImportance(input);

    res.json({ success: true, assessment });
  } catch (error: any) {
    console.error('Assess importance error:', error);
    res.status(500).json({ error: error.message || 'Failed to assess importance' });
  }
}

// =====================================================
// PLANNING & DASHBOARD ENDPOINTS
// =====================================================

/**
 * Get retention plan
 * GET /api/v1/agent-memory-lifecycle/retention-plan
 */
export async function getRetentionPlan(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { agentId, threadId } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetRetentionPlanInput = {
      organizationId,
      agentId: agentId as string | undefined,
      threadId: threadId as string | undefined,
    };

    const plan = await memoryLifecycleEngine.getMemoryRetentionPlan(input);

    res.json({ success: true, plan });
  } catch (error: any) {
    console.error('Get retention plan error:', error);
    res.status(500).json({ error: error.message || 'Failed to get retention plan' });
  }
}

/**
 * Get lifecycle dashboard
 * GET /api/v1/agent-memory-lifecycle/dashboard
 */
export async function getLifecycleDashboard(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { agentId, periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetLifecycleDashboardInput = {
      organizationId,
      agentId: agentId as string | undefined,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
    };

    const dashboard = await memoryLifecycleEngine.getLifecycleDashboard(input);

    res.json({ success: true, dashboard });
  } catch (error: any) {
    console.error('Get lifecycle dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get lifecycle dashboard' });
  }
}
