// =====================================================
// CONTENT & SEO CONTROLLER
// =====================================================

import { Request, Response } from 'express';
import {
  CreateKeywordClusterSchema,
  CreateContentItemSchema,
  UpdateContentItemSchema,
  CreateContentCalendarSchema,
  CreateSEOAuditSchema,
  CreateContentTaskSchema,
  UpdateContentTaskSchema,
  GenerateContentIdeasSchema,
} from '@pravado/shared-types';
import * as contentService from '../services/content.service';

// KEYWORD CLUSTERS
export async function createKeywordCluster(req: Request, res: Response) {
  try {
    const input = CreateKeywordClusterSchema.parse(req.body);
    const cluster = await contentService.createKeywordCluster(input, req.user!.id);
    res.status(201).json(cluster);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function listKeywordClusters(req: Request, res: Response) {
  try {
    const clusters = await contentService.listKeywordClusters(req.user!.organizationId);
    res.json(clusters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// CONTENT ITEMS
export async function createContentItem(req: Request, res: Response) {
  try {
    const input = CreateContentItemSchema.parse(req.body);
    const content = await contentService.createContentItem(input, req.user!.id);
    res.status(201).json(content);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function getContentItem(req: Request, res: Response) {
  try {
    const content = await contentService.getContentItemById(req.params.id, req.user!.organizationId);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listContentItems(req: Request, res: Response) {
  try {
    const { status, format, clusterId, assignedTo } = req.query;
    const content = await contentService.listContentItems(req.user!.organizationId, {
      status: status as string, format: format as string,
      clusterId: clusterId as string, assignedTo: assignedTo as string,
    });
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateContentItem(req: Request, res: Response) {
  try {
    const input = UpdateContentItemSchema.parse(req.body);
    const content = await contentService.updateContentItem(req.params.id, input, req.user!.id, req.user!.organizationId);
    res.json(content);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function deleteContentItem(req: Request, res: Response) {
  try {
    await contentService.deleteContentItem(req.params.id, req.user!.organizationId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getContentStats(req: Request, res: Response) {
  try {
    const stats = await contentService.getContentStats(req.user!.organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// CALENDAR
export async function getContentCalendar(req: Request, res: Response) {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'Month and year required' });
    const calendar = await contentService.getContentCalendar(req.user!.organizationId, parseInt(month as string), parseInt(year as string));
    res.json(calendar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createContentCalendar(req: Request, res: Response) {
  try {
    const input = CreateContentCalendarSchema.parse(req.body);
    const calendar = await contentService.createContentCalendar(input, req.user!.id);
    res.status(201).json(calendar);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

// SEO AUDITS
export async function createSEOAudit(req: Request, res: Response) {
  try {
    const input = CreateSEOAuditSchema.parse(req.body);
    const audit = await contentService.createSEOAudit(input, req.user!.id);
    res.status(201).json(audit);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function listSEOAudits(req: Request, res: Response) {
  try {
    const audits = await contentService.listSEOAudits(req.user!.organizationId, req.query.contentItemId as string);
    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// TASKS
export async function createContentTask(req: Request, res: Response) {
  try {
    const input = CreateContentTaskSchema.parse(req.body);
    const task = await contentService.createContentTask(input, req.user!.id);
    res.status(201).json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function listContentTasks(req: Request, res: Response) {
  try {
    const tasks = await contentService.listContentTasks(req.params.contentItemId, req.user!.organizationId);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateContentTask(req: Request, res: Response) {
  try {
    const input = UpdateContentTaskSchema.parse(req.body);
    const task = await contentService.updateContentTask(req.params.id, input, req.user!.id, req.user!.organizationId);
    res.json(task);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

// AI ENDPOINTS
export async function generateContentIdeas(req: Request, res: Response) {
  try {
    const input = GenerateContentIdeasSchema.parse(req.body);
    const ideas = await contentService.generateContentIdeas(input, req.user!.organizationId);
    res.json({ ideas });
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: error.errors });
    res.status(500).json({ error: error.message });
  }
}

export async function enhanceContent(req: Request, res: Response) {
  try {
    const content = await contentService.getContentItemById(req.params.id, req.user!.organizationId);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    if (!content.bodyMd) return res.status(400).json({ error: 'Content must have body text' });
    const enhanced = await contentService.updateContentItem(req.params.id, { bodyMd: content.bodyMd }, req.user!.id, req.user!.organizationId);
    res.json(enhanced);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
