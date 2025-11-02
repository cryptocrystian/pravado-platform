// =====================================================
// AGENT TEMPLATE ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/agent-template.controller';

const router = Router();

router.use(authenticate);

// TEMPLATES
router.post('/templates', requireRole('CONTRIBUTOR'), controller.createTemplate);
router.get('/templates', controller.listTemplates);
router.get('/templates/:id', controller.getTemplate);
router.patch('/templates/:id', requireRole('CONTRIBUTOR'), controller.updateTemplate);
router.delete('/templates/:id', requireRole('ADMIN'), controller.deleteTemplate);

// EXECUTIONS
router.post('/execute', requireRole('CONTRIBUTOR'), controller.executeAgent);
router.get('/executions', controller.listExecutions);
router.get('/executions/:id', controller.getExecution);
router.get('/executions/:id/results', controller.getExecutionResults);

// STATS
router.get('/stats', controller.getStats);

export default router;
