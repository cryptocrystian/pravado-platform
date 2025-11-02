// =====================================================
// PITCH WORKFLOW ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/pitch-workflow.controller';

const router = Router();

router.use(authenticate);

// WORKFLOWS
router.post('/', requireRole('CONTRIBUTOR'), controller.createWorkflow);
router.get('/', controller.listWorkflows);
router.get('/:id', controller.getWorkflow);
router.patch('/:id', requireRole('CONTRIBUTOR'), controller.updateWorkflow);
router.delete('/:id', requireRole('ADMIN'), controller.deleteWorkflow);

// WORKFLOW STATS
router.get('/:id/stats', controller.getWorkflowStats);

// WORKFLOW ACTIONS
router.post('/:id/start', requireRole('CONTRIBUTOR'), controller.startWorkflow);
router.post('/:id/pause', requireRole('CONTRIBUTOR'), controller.pauseWorkflow);
router.post('/:id/cancel', requireRole('CONTRIBUTOR'), controller.cancelWorkflow);

// JOBS
router.get('/:workflowId/jobs', controller.listJobs);
router.get('/jobs/:id', controller.getJob);

// EVENTS
router.get('/:workflowId/events', controller.listEvents);

export default router;
