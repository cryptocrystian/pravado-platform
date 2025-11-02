import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All contact routes require authentication
router.use(authenticate);

// Contact CRUD
router.get('/', contactController.searchContacts);
router.get('/stats', contactController.getStats);
router.get('/:id', contactController.getContact);
router.post('/', contactController.createContact);
router.patch('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);
router.post('/bulk-delete', contactController.bulkDeleteContacts);

// Tags
router.get('/tags', contactController.getTags);
router.post('/tags', contactController.createTag);
router.patch('/tags/:id', contactController.updateTag);
router.delete('/tags/:id', contactController.deleteTag);

// Enrichment
router.post('/enrich', contactController.triggerEnrichment);
router.get('/enrichment/:jobId', contactController.getEnrichmentJob);
router.get('/enrichment', contactController.getEnrichmentJobs);

export default router;
