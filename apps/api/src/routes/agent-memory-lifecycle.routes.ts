// =====================================================
// AGENT MEMORY LIFECYCLE ROUTES
// Sprint 37: Autonomous memory pruning, aging, and lifespan management
// =====================================================

import { Router } from 'express';
import * as lifecycleController from '../controllers/agent-memory-lifecycle.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All memory lifecycle routes require authentication
router.use(authenticate);

// =====================================================
// AGING OPERATIONS
// =====================================================

/**
 * Age all memory episodes (decay score based on time)
 * POST /api/v1/agent-memory-lifecycle/age
 *
 * Body: { agentId?, organizationId?, dryRun? }
 */
router.post('/age', lifecycleController.ageMemory);

/**
 * Reinforce memory episode (boost age score on access)
 * POST /api/v1/agent-memory-lifecycle/reinforce
 *
 * Body: { episodeId, boostFactor? }
 */
router.post('/reinforce', lifecycleController.reinforceMemory);

/**
 * Get aging metrics for a memory episode
 * GET /api/v1/agent-memory-lifecycle/aging-metrics/:episodeId
 */
router.get('/aging-metrics/:episodeId', lifecycleController.getAgingMetrics);

// =====================================================
// COMPRESSION OPERATIONS
// =====================================================

/**
 * Compress old/stale memory episodes using GPT-4
 * POST /api/v1/agent-memory-lifecycle/compress
 *
 * Body: { agentId?, organizationId?, ageThreshold?, dryRun?, maxEpisodes? }
 */
router.post('/compress', lifecycleController.compressMemory);

// =====================================================
// PRUNING & ARCHIVAL OPERATIONS
// =====================================================

/**
 * Prune expired memory episodes (soft delete)
 * POST /api/v1/agent-memory-lifecycle/prune
 *
 * Body: { agentId?, organizationId?, dryRun?, maxEpisodes? }
 */
router.post('/prune', lifecycleController.pruneMemory);

/**
 * Archive memory episodes
 * POST /api/v1/agent-memory-lifecycle/archive
 *
 * Body: { episodeIds, reason? }
 */
router.post('/archive', lifecycleController.archiveMemory);

/**
 * Mark episode(s) for archival with expiration
 * PUT /api/v1/agent-memory-lifecycle/mark-archival
 *
 * Body: { episodeIds, expiresInDays, reason? }
 */
router.put('/mark-archival', lifecycleController.markForArchival);

// =====================================================
// AI-POWERED OPERATIONS (GPT-4)
// =====================================================

/**
 * Get AI recommendations for archival candidates
 * POST /api/v1/agent-memory-lifecycle/recommend-archival
 *
 * Body: { agentId?, organizationId?, limit?, minDaysOld? }
 */
router.post('/recommend-archival', lifecycleController.recommendArchival);

/**
 * Assess memory importance using GPT-4
 * POST /api/v1/agent-memory-lifecycle/assess-importance
 *
 * Body: { episodeIds }
 */
router.post('/assess-importance', lifecycleController.assessImportance);

// =====================================================
// DASHBOARD & PLANNING
// =====================================================

/**
 * Get memory retention plan
 * GET /api/v1/agent-memory-lifecycle/retention-plan
 *
 * Query: agentId?, organizationId?
 */
router.get('/retention-plan', lifecycleController.getRetentionPlan);

/**
 * Get lifecycle dashboard metrics
 * GET /api/v1/agent-memory-lifecycle/dashboard
 *
 * Query: agentId?, organizationId?
 */
router.get('/dashboard', lifecycleController.getLifecycleDashboard);

export default router;
