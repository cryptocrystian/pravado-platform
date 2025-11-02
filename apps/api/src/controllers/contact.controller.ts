// =====================================================
// CONTACT CONTROLLER
// =====================================================
// HTTP request handlers for contact management endpoints

import type { Request, Response, NextFunction } from 'express';
import { contactService } from '../services/contact.service';
import { logger } from '../lib/logger';
import {
  ContactSearchParamsSchema,
  CreateContactInputSchema,
  UpdateContactInputSchema,
  CreateContactTagInputSchema,
  UpdateContactTagInputSchema,
  TriggerEnrichmentInputSchema,
  BulkDeleteContactsInputSchema,
} from '@pravado/shared-types';

class ContactController {
  /**
   * GET /api/contacts
   * Search contacts with filters and pagination
   */
  async searchContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Parse and validate search params
      const params = ContactSearchParamsSchema.parse({
        search: req.query.search,
        tier: req.query.tier ? JSON.parse(req.query.tier as string) : undefined,
        topics: req.query.topics ? JSON.parse(req.query.topics as string) : undefined,
        regions: req.query.regions ? JSON.parse(req.query.regions as string) : undefined,
        tagIds: req.query.tagIds ? JSON.parse(req.query.tagIds as string) : undefined,
        outlet: req.query.outlet,
        role: req.query.role ? JSON.parse(req.query.role as string) : undefined,
        hasEmail: req.query.hasEmail === 'true',
        hasLinkedIn: req.query.hasLinkedIn === 'true',
        hasTwitter: req.query.hasTwitter === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      });

      const result = await contactService.searchContacts(organizationId, params);

      res.json(result);
    } catch (error) {
      logger.error('Failed to search contacts', error);
      next(error);
    }
  }

  /**
   * GET /api/contacts/:id
   * Get contact by ID
   */
  async getContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const contact = await contactService.getContactById(id, organizationId);

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      res.json(contact);
    } catch (error) {
      logger.error('Failed to fetch contact', error);
      next(error);
    }
  }

  /**
   * POST /api/contacts
   * Create new contact
   */
  async createContact(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateContactInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const contact = await contactService.createContact(input, userId);

      res.status(201).json(contact);
    } catch (error) {
      logger.error('Failed to create contact', error);
      next(error);
    }
  }

  /**
   * PATCH /api/contacts/:id
   * Update contact
   */
  async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateContactInputSchema.parse(req.body);

      const contact = await contactService.updateContact(id, input, organizationId, userId);

      res.json(contact);
    } catch (error) {
      logger.error('Failed to update contact', error);
      next(error);
    }
  }

  /**
   * DELETE /api/contacts/:id
   * Soft delete contact
   */
  async deleteContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;
      const userRole = (req as any).user?.role;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Only Admin/Manager can delete
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await contactService.deleteContact(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete contact', error);
      next(error);
    }
  }

  /**
   * POST /api/contacts/bulk-delete
   * Bulk delete contacts
   */
  async bulkDeleteContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userRole = (req as any).user?.role;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Only Admin/Manager can delete
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { contactIds } = BulkDeleteContactsInputSchema.parse(req.body);

      const deletedCount = await contactService.bulkDeleteContacts(contactIds, organizationId);

      res.json({ deletedCount });
    } catch (error) {
      logger.error('Failed to bulk delete contacts', error);
      next(error);
    }
  }

  /**
   * GET /api/contacts/stats
   * Get contact statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await contactService.getContactStats(organizationId);

      res.json(stats);
    } catch (error) {
      logger.error('Failed to get contact stats', error);
      next(error);
    }
  }

  // =====================================================
  // TAG ENDPOINTS
  // =====================================================

  /**
   * GET /api/contacts/tags
   * Get all tags
   */
  async getTags(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tags = await contactService.getTags(organizationId);

      res.json(tags);
    } catch (error) {
      logger.error('Failed to fetch tags', error);
      next(error);
    }
  }

  /**
   * POST /api/contacts/tags
   * Create new tag
   */
  async createTag(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateContactTagInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const tag = await contactService.createTag(input);

      res.status(201).json(tag);
    } catch (error) {
      logger.error('Failed to create tag', error);
      next(error);
    }
  }

  /**
   * PATCH /api/contacts/tags/:id
   * Update tag
   */
  async updateTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateContactTagInputSchema.parse(req.body);

      const tag = await contactService.updateTag(id, input, organizationId);

      res.json(tag);
    } catch (error) {
      logger.error('Failed to update tag', error);
      next(error);
    }
  }

  /**
   * DELETE /api/contacts/tags/:id
   * Delete tag
   */
  async deleteTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await contactService.deleteTag(id, organizationId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete tag', error);
      next(error);
    }
  }

  // =====================================================
  // ENRICHMENT ENDPOINTS
  // =====================================================

  /**
   * POST /api/contacts/enrich
   * Trigger enrichment for contacts
   */
  async triggerEnrichment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const organizationId = (req as any).user?.organizationId;
      const userRole = (req as any).user?.role;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Only Admin/Manager can trigger enrichment
      if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const input = TriggerEnrichmentInputSchema.parse({
        ...req.body,
        organizationId,
      });

      const jobId = await contactService.triggerEnrichment(input, userId);

      res.json({
        message: 'Enrichment job created',
        jobId,
      });
    } catch (error) {
      logger.error('Failed to trigger enrichment', error);
      next(error);
    }
  }

  /**
   * GET /api/contacts/enrichment/:jobId
   * Get enrichment job status
   */
  async getEnrichmentJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const job = await contactService.getEnrichmentJob(jobId, organizationId);

      res.json(job);
    } catch (error) {
      logger.error('Failed to fetch enrichment job', error);
      next(error);
    }
  }

  /**
   * GET /api/contacts/enrichment
   * Get all enrichment jobs
   */
  async getEnrichmentJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const jobs = await contactService.getEnrichmentJobs(organizationId);

      res.json(jobs);
    } catch (error) {
      logger.error('Failed to fetch enrichment jobs', error);
      next(error);
    }
  }
}

export const contactController = new ContactController();
