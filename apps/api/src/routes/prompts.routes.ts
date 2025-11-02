// =====================================================
// PROMPTS ROUTES
// Sprint 30: Advanced prompt engineering + modular blocks
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as promptsController from '../controllers/prompts.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// PROMPT BLOCK ROUTES
// =====================================================

/**
 * Create prompt block
 * POST /api/v1/prompts/block
 * Body: CreatePromptBlockInput
 */
router.post('/block', promptsController.createBlock);

/**
 * Update prompt block
 * PUT /api/v1/prompts/block/:id
 * Body: UpdatePromptBlockInput
 */
router.put('/block/:id', promptsController.updateBlock);

/**
 * Delete prompt block (soft delete)
 * DELETE /api/v1/prompts/block/:id
 */
router.delete('/block/:id', promptsController.deleteBlock);

/**
 * List all blocks
 * GET /api/v1/prompts/blocks
 * Query: blockType?, modelScope?, category?, tags?
 */
router.get('/blocks', promptsController.listBlocks);

/**
 * Get block by ID
 * GET /api/v1/prompts/block/:id
 */
router.get('/block/:id', promptsController.getBlock);

// =====================================================
// PROMPT TEMPLATE ROUTES
// =====================================================

/**
 * Create prompt template
 * POST /api/v1/prompts/template
 * Body: CreatePromptTemplateInput
 */
router.post('/template', promptsController.createTemplate);

/**
 * Update prompt template
 * PUT /api/v1/prompts/template/:id
 * Body: UpdatePromptTemplateInput
 */
router.put('/template/:id', promptsController.updateTemplate);

/**
 * Delete prompt template (soft delete)
 * DELETE /api/v1/prompts/template/:id
 */
router.delete('/template/:id', promptsController.deleteTemplate);

/**
 * List templates
 * GET /api/v1/prompts/templates
 * Query: useCaseTag?, modelScope?
 */
router.get('/templates', promptsController.listTemplates);

/**
 * Get template with optional assembled prompt
 * GET /api/v1/prompts/template/:id
 * Query: assemble? (boolean)
 */
router.get('/template/:id', promptsController.getTemplate);

/**
 * Assembled preview with GPT summary
 * POST /api/v1/prompts/template/:id/preview
 */
router.post('/template/:id/preview', promptsController.previewTemplate);

// =====================================================
// VALIDATION & IMPROVEMENT ROUTES
// =====================================================

/**
 * Validate prompt blocks
 * POST /api/v1/prompts/validate
 * Body: ValidatePromptInput
 */
router.post('/validate', promptsController.validatePrompt);

/**
 * GPT-powered improvement suggestions
 * POST /api/v1/prompts/improve
 * Body: ImprovePromptInput
 */
router.post('/improve', promptsController.improvePrompt);

export default router;
