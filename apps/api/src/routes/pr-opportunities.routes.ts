// =====================================================
// PR OPPORTUNITIES ROUTES
// Sprint 68 Track B
// =====================================================
// Route definitions for media opportunity API endpoints

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/pr-opportunities.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =====================================================
// SCAN ROUTES
// =====================================================

// Trigger manual scan for opportunities
router.post('/opportunities/scan', requireRole('CONTRIBUTOR'), controller.scanOpportunities);

// =====================================================
// OPPORTUNITY ROUTES
// =====================================================

// List opportunities with filtering
router.get('/opportunities', controller.listOpportunities);

// Get opportunity statistics
router.get('/opportunities/stats', controller.getOpportunityStats);

// Get single opportunity
router.get('/opportunities/:id', controller.getOpportunity);

// Update opportunity status
router.patch('/opportunities/:id/status', requireRole('CONTRIBUTOR'), controller.updateOpportunityStatus);

export default router;
