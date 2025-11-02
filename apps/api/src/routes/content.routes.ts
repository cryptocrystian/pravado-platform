// =====================================================
// CONTENT & SEO ROUTES
// =====================================================

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as controller from '../controllers/content.controller';

const router = Router();

router.use(authenticate);

// KEYWORD CLUSTERS
router.post('/clusters', requireRole('CONTRIBUTOR'), controller.createKeywordCluster);
router.get('/clusters', controller.listKeywordClusters);

// CONTENT ITEMS
router.post('/items', requireRole('CONTRIBUTOR'), controller.createContentItem);
router.get('/items', controller.listContentItems);
router.get('/items/:id', controller.getContentItem);
router.patch('/items/:id', requireRole('CONTRIBUTOR'), controller.updateContentItem);
router.delete('/items/:id', requireRole('ADMIN'), controller.deleteContentItem);
router.post('/items/:id/enhance', requireRole('CONTRIBUTOR'), controller.enhanceContent);

// STATS & CALENDAR
router.get('/stats', controller.getContentStats);
router.get('/calendar', controller.getContentCalendar);
router.post('/calendar', requireRole('CONTRIBUTOR'), controller.createContentCalendar);

// SEO AUDITS
router.post('/seo/audits', requireRole('CONTRIBUTOR'), controller.createSEOAudit);
router.get('/seo/audits', controller.listSEOAudits);

// TASKS
router.post('/items/:contentItemId/tasks', requireRole('CONTRIBUTOR'), controller.createContentTask);
router.get('/items/:contentItemId/tasks', controller.listContentTasks);
router.patch('/tasks/:id', requireRole('CONTRIBUTOR'), controller.updateContentTask);

// AI
router.post('/ideas', requireRole('CONTRIBUTOR'), controller.generateContentIdeas);

export default router;
