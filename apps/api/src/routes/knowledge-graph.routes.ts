// =====================================================
// KNOWLEDGE GRAPH ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as memoryController from '../controllers/memory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Insert knowledge graph node
 * POST /api/v1/knowledge-graph/node
 */
router.post('/node', memoryController.insertKGNode);

/**
 * Link knowledge graph nodes
 * POST /api/v1/knowledge-graph/link
 */
router.post('/link', memoryController.linkKGNodes);

/**
 * Get campaign knowledge graph
 * GET /api/v1/knowledge-graph/:campaignId
 * Query params: nodeTypes (comma-separated), minImportance
 */
router.get('/:campaignId', memoryController.getCampaignKnowledgeGraph);

export default router;
