// =====================================================
// AGENT MEMORY ROUTES
// Sprint 36: Long-term agent memory and contextual recall
// =====================================================

import { Router } from 'express';
import * as agentMemoryController from '../controllers/agent-memory.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All agent memory routes require authentication
router.use(authenticate);

// =====================================================
// MEMORY EPISODE ROUTES
// =====================================================

/**
 * Store memory episode
 * POST /api/v1/agent-memory/episodes
 */
router.post('/episodes', agentMemoryController.storeEpisode);

/**
 * Update memory episode
 * PUT /api/v1/agent-memory/episodes/:episodeId
 */
router.put('/episodes/:episodeId', agentMemoryController.updateEpisode);

/**
 * Get memory episodes (list/filter)
 * GET /api/v1/agent-memory/episodes
 */
router.get('/episodes', agentMemoryController.getEpisodes);

/**
 * Get memory episode by ID
 * GET /api/v1/agent-memory/episodes/:episodeId
 */
router.get('/episodes/:episodeId', agentMemoryController.getEpisodeById);

// =====================================================
// MEMORY OPERATIONS ROUTES
// =====================================================

/**
 * Embed memory chunks
 * POST /api/v1/agent-memory/episodes/:episodeId/embed
 */
router.post('/episodes/:episodeId/embed', agentMemoryController.embedChunks);

/**
 * Link memory references
 * POST /api/v1/agent-memory/episodes/:episodeId/link
 */
router.post('/episodes/:episodeId/link', agentMemoryController.linkReferences);

/**
 * Log memory event
 * POST /api/v1/agent-memory/episodes/:episodeId/events
 */
router.post('/episodes/:episodeId/events', agentMemoryController.logEvent);

// =====================================================
// SEARCH & RECALL ROUTES
// =====================================================

/**
 * Search memory
 * POST /api/v1/agent-memory/search
 */
router.post('/search', agentMemoryController.searchMemory);

/**
 * Get memory context for agent
 * POST /api/v1/agent-memory/context
 */
router.post('/context', agentMemoryController.getMemoryContext);

/**
 * Inject memory into prompt
 * POST /api/v1/agent-memory/inject-prompt
 */
router.post('/inject-prompt', agentMemoryController.injectPrompt);

// =====================================================
// AI OPERATIONS ROUTES
// =====================================================

/**
 * Summarize memory episode (GPT-4)
 * POST /api/v1/agent-memory/episodes/:episodeId/summarize
 */
router.post('/episodes/:episodeId/summarize', agentMemoryController.summarizeEpisode);

/**
 * Compress memories (GPT-4)
 * POST /api/v1/agent-memory/compress
 */
router.post('/compress', agentMemoryController.compressMemories);

// =====================================================
// ANALYTICS ROUTES
// =====================================================

/**
 * Get memory timeline
 * GET /api/v1/agent-memory/timeline
 */
router.get('/timeline', agentMemoryController.getTimeline);

/**
 * Get memory dashboard
 * GET /api/v1/agent-memory/dashboard
 */
router.get('/dashboard', agentMemoryController.getDashboard);

export default router;
