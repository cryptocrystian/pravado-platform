// =====================================================
// REPORTING ROUTES
// Sprint 29: AI-driven reporting and strategic insights
// =====================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reportingController from '../controllers/reporting.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// REPORT GENERATION ROUTES
// =====================================================

/**
 * Generate new report for a campaign
 * POST /api/v1/reporting/campaign/:campaignId/generate-report
 * Body: { templateId?, periodStart?, periodEnd? }
 */
router.post('/campaign/:campaignId/generate-report', reportingController.generateReport);

/**
 * Get latest report for a campaign
 * GET /api/v1/reporting/campaign/:campaignId/report
 */
router.get('/campaign/:campaignId/report', reportingController.getLatestReport);

/**
 * Get specific report by ID
 * GET /api/v1/reporting/campaign/:campaignId/report/:reportId
 */
router.get('/campaign/:campaignId/report/:reportId', reportingController.getReport);

/**
 * Generate quick GPT summary (without full report)
 * POST /api/v1/reporting/campaign/:campaignId/summary
 * Body: { periodStart?, periodEnd?, includeRecommendations? }
 */
router.post('/campaign/:campaignId/summary', reportingController.generateSummary);

/**
 * Get report sections
 * GET /api/v1/reporting/report/:reportId/sections
 */
router.get('/report/:reportId/sections', reportingController.getReportSections);

/**
 * Retry failed report
 * POST /api/v1/reporting/report/:reportId/retry
 */
router.post('/report/:reportId/retry', reportingController.retryReport);

// =====================================================
// TEMPLATE ROUTES
// =====================================================

/**
 * Get available report templates
 * GET /api/v1/reporting/templates
 */
router.get('/templates', reportingController.getTemplates);

/**
 * Create report template
 * POST /api/v1/reporting/template
 * Body: CreateReportTemplateInput
 */
router.post('/template', reportingController.createTemplate);

/**
 * Update report template
 * PUT /api/v1/reporting/template/:templateId
 * Body: UpdateReportTemplateInput
 */
router.put('/template/:templateId', reportingController.updateTemplate);

/**
 * Delete report template (soft delete)
 * DELETE /api/v1/reporting/template/:templateId
 */
router.delete('/template/:templateId', reportingController.deleteTemplate);

export default router;
