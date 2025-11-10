// =====================================================
// PROMPT TEMPLATE ROUTES
// Core Infrastructure: REST API for Prompt Templates
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { Router } from 'express';
import * as promptTemplateController from '../controllers/prompt-template.controller';

const router = Router();

// =====================================================
// TEMPLATE CRUD ROUTES
// =====================================================

/**
 * @route   GET /api/v1/prompt-templates
 * @desc    List all prompt templates with filters
 * @query   category, useCase, active, search, limit, offset
 * @access  Protected (requires organization ID)
 */
router.get('/', promptTemplateController.listPromptTemplates);

/**
 * @route   GET /api/v1/prompt-templates/use-case/:useCase
 * @desc    Get latest active template by use case
 * @query   category - Optional category filter
 * @access  Protected (requires organization ID)
 */
router.get('/use-case/:useCase', promptTemplateController.getPromptTemplateByUseCase);

/**
 * @route   POST /api/v1/prompt-templates
 * @desc    Create a new prompt template
 * @access  Protected (requires organization ID)
 */
router.post('/', promptTemplateController.createPromptTemplate);

/**
 * @route   GET /api/v1/prompt-templates/:id
 * @desc    Get prompt template by ID
 * @query   includeDetails - Include slots and recent invocations
 * @access  Protected (requires organization ID)
 */
router.get('/:id', promptTemplateController.getPromptTemplateById);

/**
 * @route   PUT /api/v1/prompt-templates/:id
 * @desc    Update existing prompt template
 * @access  Protected (requires organization ID)
 */
router.put('/:id', promptTemplateController.updatePromptTemplate);

/**
 * @route   DELETE /api/v1/prompt-templates/:id
 * @desc    Soft delete a prompt template (sets active = false)
 * @access  Protected (requires organization ID)
 */
router.delete('/:id', promptTemplateController.deletePromptTemplate);

// =====================================================
// PROMPT RESOLUTION ROUTES
// =====================================================

/**
 * @route   POST /api/v1/prompt-templates/:id/resolve
 * @desc    Resolve a prompt template with given context
 * @body    { context: PromptResolutionContext }
 * @access  Protected (requires organization ID)
 */
router.post('/:id/resolve', promptTemplateController.resolvePromptTemplate);

// =====================================================
// ANALYTICS ROUTES
// =====================================================

/**
 * @route   GET /api/v1/prompt-templates/:id/analytics
 * @desc    Get template performance analytics
 * @query   days - Number of days to analyze (default: 30)
 * @access  Protected (requires organization ID)
 */
router.get('/:id/analytics', promptTemplateController.getPromptTemplateAnalytics);

// =====================================================
// SLOT MANAGEMENT ROUTES
// =====================================================

/**
 * @route   POST /api/v1/prompt-templates/:id/slots
 * @desc    Create a new slot for a template
 * @access  Protected (requires organization ID)
 */
router.post('/:id/slots', promptTemplateController.createPromptSlot);

/**
 * @route   PUT /api/v1/prompt-templates/:templateId/slots/:slotId
 * @desc    Update a prompt slot
 * @access  Protected (requires organization ID)
 */
router.put('/:templateId/slots/:slotId', promptTemplateController.updatePromptSlot);

/**
 * @route   DELETE /api/v1/prompt-templates/:templateId/slots/:slotId
 * @desc    Delete a prompt slot
 * @access  Protected (requires organization ID)
 */
router.delete('/:templateId/slots/:slotId', promptTemplateController.deletePromptSlot);

export default router;
