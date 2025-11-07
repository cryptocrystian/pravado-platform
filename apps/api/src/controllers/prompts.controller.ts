// =====================================================
// PROMPTS CONTROLLER
// Sprint 30: Advanced prompt engineering + modular blocks
// =====================================================

import { Request, Response } from 'express';
import { promptEngine } from '../../../agents/src/prompts/prompt-engine';
import type {
  CreatePromptBlockInput,
  UpdatePromptBlockInput,
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  ValidatePromptInput,
  ImprovePromptInput,
  BlockType,
  UseCaseTag,
  ModelScope,
} from '@pravado/types';

// =====================================================
// PROMPT BLOCK ENDPOINTS
// =====================================================

/**
 * Create prompt block
 * POST /api/v1/prompts/block
 */
export async function createBlock(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreatePromptBlockInput = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const block = await promptEngine.createPromptBlock(input);

    res.json({ success: true, block });
  } catch (error: any) {
    console.error('Create block error:', error);
    res.status(500).json({ error: error.message || 'Failed to create prompt block' });
  }
}

/**
 * Update prompt block
 * PUT /api/v1/prompts/block/:id
 */
export async function updateBlock(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdatePromptBlockInput = {
      blockId: id,
      ...req.body,
    };

    const block = await promptEngine.updatePromptBlock(input);

    res.json({ success: true, block });
  } catch (error: any) {
    console.error('Update block error:', error);
    res.status(500).json({ error: error.message || 'Failed to update prompt block' });
  }
}

/**
 * Delete prompt block
 * DELETE /api/v1/prompts/block/:id
 */
export async function deleteBlock(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    await promptEngine.deletePromptBlock(id, organizationId);

    res.json({ success: true, message: 'Block deleted successfully' });
  } catch (error: any) {
    console.error('Delete block error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete prompt block' });
  }
}

/**
 * List all blocks
 * GET /api/v1/prompts/blocks
 */
export async function listBlocks(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const filters: any = {};

    if (req.query.blockType) {
      filters.blockType = req.query.blockType as BlockType;
    }

    if (req.query.modelScope) {
      filters.modelScope = req.query.modelScope as ModelScope;
    }

    if (req.query.category) {
      filters.category = req.query.category as string;
    }

    if (req.query.tags) {
      filters.tags = Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags];
    }

    const blocks = await promptEngine.listPromptBlocks(organizationId, filters);

    res.json({ success: true, blocks, total: blocks.length });
  } catch (error: any) {
    console.error('List blocks error:', error);
    res.status(500).json({ error: error.message || 'Failed to list prompt blocks' });
  }
}

/**
 * Get block by ID
 * GET /api/v1/prompts/block/:id
 */
export async function getBlock(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const block = await promptEngine.getPromptBlock(id, organizationId);

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ success: true, block });
  } catch (error: any) {
    console.error('Get block error:', error);
    res.status(500).json({ error: error.message || 'Failed to get prompt block' });
  }
}

// =====================================================
// PROMPT TEMPLATE ENDPOINTS
// =====================================================

/**
 * Create prompt template
 * POST /api/v1/prompts/template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreatePromptTemplateInput = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const template = await promptEngine.createPromptTemplate(input);

    res.json({ success: true, template });
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message || 'Failed to create prompt template' });
  }
}

/**
 * Update prompt template
 * PUT /api/v1/prompts/template/:id
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdatePromptTemplateInput = {
      templateId: id,
      ...req.body,
    };

    const template = await promptEngine.updatePromptTemplate(input);

    res.json({ success: true, template });
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: error.message || 'Failed to update prompt template' });
  }
}

/**
 * Delete prompt template
 * DELETE /api/v1/prompts/template/:id
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    await promptEngine.deletePromptTemplate(id, organizationId);

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete prompt template' });
  }
}

/**
 * Get template with assembled prompt
 * GET /api/v1/prompts/template/:id
 */
export async function getTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;
    const { assemble } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const template = await promptEngine.getPromptTemplate(id, organizationId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If assemble flag is set, return assembled prompt too
    if (assemble === 'true') {
      const assembled = await promptEngine.assemblePrompt({
        templateId: id,
        organizationId,
      });

      return res.json({ success: true, template, assembled });
    }

    res.json({ success: true, template });
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: error.message || 'Failed to get prompt template' });
  }
}

/**
 * List templates
 * GET /api/v1/prompts/templates
 */
export async function listTemplates(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const filters: any = {};

    if (req.query.useCaseTag) {
      filters.useCaseTag = req.query.useCaseTag as UseCaseTag;
    }

    if (req.query.modelScope) {
      filters.modelScope = req.query.modelScope as ModelScope;
    }

    const templates = await promptEngine.listPromptTemplates(organizationId, filters);

    res.json({ success: true, templates, total: templates.length });
  } catch (error: any) {
    console.error('List templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to list prompt templates' });
  }
}

/**
 * Assembled preview with GPT summary
 * POST /api/v1/prompts/template/:id/preview
 */
export async function previewTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const preview = await promptEngine.getPromptPreview(id, organizationId);

    res.json({ success: true, preview });
  } catch (error: any) {
    console.error('Preview template error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview prompt template' });
  }
}

// =====================================================
// VALIDATION & IMPROVEMENT ENDPOINTS
// =====================================================

/**
 * Validate prompt blocks
 * POST /api/v1/prompts/validate
 */
export async function validatePrompt(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ValidatePromptInput = req.body;

    const validation = await promptEngine.validatePrompt(input);

    res.json({ success: true, validation });
  } catch (error: any) {
    console.error('Validate prompt error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate prompt' });
  }
}

/**
 * GPT-powered improvement suggestions
 * POST /api/v1/prompts/improve
 */
export async function improvePrompt(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: ImprovePromptInput = req.body;

    const improvement = await promptEngine.recommendPromptImprovements(input);

    res.json({ success: true, improvement });
  } catch (error: any) {
    console.error('Improve prompt error:', error);
    res.status(500).json({ error: error.message || 'Failed to improve prompt' });
  }
}
