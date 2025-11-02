// =====================================================
// MEMORY ROUTES - AI Memory & Strategy API
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as memoryController from '../controllers/memory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// MEMORY ROUTES
// =====================================================

/**
 * Store memory manually
 * POST /api/v1/memory/store
 * Body: StoreMemoryInput
 */
router.post('/store', memoryController.storeMemory);

/**
 * Query memories using semantic search
 * POST /api/v1/memory/query
 * Body: QueryMemoriesInput
 */
router.post('/query', memoryController.queryMemories);

/**
 * Search memories by text query
 * POST /api/v1/memory/search
 * Body: { query: string, agentType?, campaignId?, memoryTypes?, limit? }
 */
router.post('/search', memoryController.searchMemories);

/**
 * Get campaign memory context
 * GET /api/v1/memory/campaign/:campaignId
 * Query params: limit
 */
router.get('/campaign/:campaignId', memoryController.getCampaignMemory);

/**
 * Inject context for planning/execution
 * POST /api/v1/memory/inject-context
 * Body: ContextInjectionInput
 */
router.post('/inject-context', memoryController.injectContext);

export default router;
