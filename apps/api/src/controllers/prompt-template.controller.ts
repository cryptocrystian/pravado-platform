// =====================================================
// PROMPT TEMPLATE CONTROLLER
// Core Infrastructure: API Layer for Prompt Templates
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { promptTemplateEngine } from '../../../agents/src/prompts/prompt-template-engine';
import type {
  CreatePromptTemplateInput,
  UpdatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateWithDetails,
  PromptTemplatesResponse,
  GetPromptTemplatesInput,
  ResolvePromptInput,
  ResolvePromptOutput,
  PromptPerformanceMetrics,
  GetTemplatePerformanceInput,
  PromptSlot,
  CreatePromptSlotInput,
  UpdatePromptSlotInput,
} from '@pravado/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// TEMPLATE CRUD OPERATIONS
// =====================================================

/**
 * Create a new prompt template
 * POST /api/v1/prompt-templates
 */
export async function createPromptTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const input: CreatePromptTemplateInput = req.body;

    // Validate required fields
    if (!input.name || !input.templateText) {
      return res.status(400).json({ error: 'Name and template text are required' });
    }

    // Insert template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        category: input.category,
        use_case: input.useCase,
        template_text: input.templateText,
        resolution_strategies: input.resolutionStrategies,
        metadata: input.metadata || {},
        active: true,
        version: 1,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    return res.status(201).json(template);
  } catch (error) {
    console.error('Error in createPromptTemplate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update existing prompt template
 * PUT /api/v1/prompt-templates/:id
 */
export async function updatePromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const input: UpdatePromptTemplateInput = req.body;

    // Build update object
    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.templateText) updateData.template_text = input.templateText;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.useCase !== undefined) updateData.use_case = input.useCase;
    if (input.active !== undefined) updateData.active = input.active;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    // Update template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return res.status(500).json({ error: 'Failed to update template' });
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json(template);
  } catch (error) {
    console.error('Error in updatePromptTemplate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get prompt template by ID
 * GET /api/v1/prompt-templates/:id
 */
export async function getPromptTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const includeDetails = req.query.includeDetails === 'true';

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Fetch template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!includeDetails) {
      return res.json(template);
    }

    // Fetch slots
    const { data: slots } = await supabase
      .from('prompt_slots')
      .select('*')
      .eq('template_id', id)
      .order('slot_name', { ascending: true });

    // Fetch recent invocations
    const { data: recentInvocations } = await supabase
      .from('prompt_invocations')
      .select('*')
      .eq('template_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    const templateWithDetails: PromptTemplateWithDetails = {
      ...template,
      slots: slots || [],
      recentInvocations: recentInvocations || [],
    };

    return res.json(templateWithDetails);
  } catch (error) {
    console.error('Error in getPromptTemplateById:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get template by use case (latest active version)
 * GET /api/v1/prompt-templates/use-case/:useCase
 */
export async function getPromptTemplateByUseCase(req: Request, res: Response) {
  try {
    const { useCase } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const category = req.query.category as string | undefined;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Use database function
    const { data, error } = await supabase.rpc('get_active_prompt_template', {
      p_organization_id: organizationId,
      p_category: category || null,
      p_use_case: useCase,
    });

    if (error) {
      console.error('Error fetching template by use case:', error);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Template not found for this use case' });
    }

    return res.json(data[0]);
  } catch (error) {
    console.error('Error in getPromptTemplateByUseCase:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * List all prompt templates with filters
 * GET /api/v1/prompt-templates
 */
export async function listPromptTemplates(req: Request, res: Response) {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const {
      category,
      useCase,
      active,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    // Build query
    let query = supabase
      .from('prompt_templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (category) query = query.eq('category', category as string);
    if (useCase) query = query.eq('use_case', useCase as string);
    if (active !== undefined) query = query.eq('active', active === 'true');

    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      console.error('Error listing templates:', error);
      return res.status(500).json({ error: 'Failed to list templates' });
    }

    const response: PromptTemplatesResponse = {
      templates: templates || [],
      total: count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    };

    return res.json(response);
  } catch (error) {
    console.error('Error in listPromptTemplates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Soft delete a prompt template
 * DELETE /api/v1/prompt-templates/:id
 */
export async function deletePromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Soft delete by setting active = false
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .update({ active: false })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting template:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error in deletePromptTemplate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// PROMPT RESOLUTION
// =====================================================

/**
 * Resolve a prompt template with given context
 * POST /api/v1/prompt-templates/:id/resolve
 */
export async function resolvePromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const input: ResolvePromptInput = req.body;

    // Validate template exists
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build resolution context
    const context = {
      ...input.context,
      organization: {
        id: organizationId,
        ...(input.context.organization || {}),
      },
      user: userId
        ? {
            id: userId,
            ...(input.context.user || {}),
          }
        : input.context.user,
    };

    // Resolve prompt using engine
    const result: ResolvePromptOutput = await promptTemplateEngine.resolvePrompt(id, context);

    return res.json(result);
  } catch (error) {
    console.error('Error in resolvePromptTemplate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// ANALYTICS
// =====================================================

/**
 * Get template performance analytics
 * GET /api/v1/prompt-templates/:id/analytics
 */
export async function getPromptTemplateAnalytics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    const days = parseInt((req.query.days as string) || '30');

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Verify template belongs to organization
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get performance metrics using database function
    const { data: metrics, error } = await supabase.rpc('calculate_prompt_performance', {
      p_template_id: id,
      p_days: days,
    });

    if (error) {
      console.error('Error fetching analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }

    return res.json(metrics);
  } catch (error) {
    console.error('Error in getPromptTemplateAnalytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// SLOT MANAGEMENT
// =====================================================

/**
 * Create a new slot for a template
 * POST /api/v1/prompt-templates/:id/slots
 */
export async function createPromptSlot(req: Request, res: Response) {
  try {
    const { id: templateId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const input: CreatePromptSlotInput = req.body;

    // Verify template exists and belongs to organization
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create slot
    const { data: slot, error } = await supabase
      .from('prompt_slots')
      .insert({
        template_id: templateId,
        slot_name: input.slotName,
        slot_type: input.slotType,
        description: input.description,
        required: input.required ?? true,
        default_value: input.defaultValue,
        validation_regex: input.validationRegex,
        example_value: input.exampleValue,
        resolution_strategy: input.resolutionStrategy,
        source_reference: input.sourceReference,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating slot:', error);
      return res.status(500).json({ error: 'Failed to create slot' });
    }

    return res.status(201).json(slot);
  } catch (error) {
    console.error('Error in createPromptSlot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update a prompt slot
 * PUT /api/v1/prompt-templates/:templateId/slots/:slotId
 */
export async function updatePromptSlot(req: Request, res: Response) {
  try {
    const { templateId, slotId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const input: UpdatePromptSlotInput = req.body;

    // Verify template exists and belongs to organization
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build update object
    const updateData: any = {};
    if (input.slotName) updateData.slot_name = input.slotName;
    if (input.slotType) updateData.slot_type = input.slotType;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.required !== undefined) updateData.required = input.required;
    if (input.defaultValue !== undefined) updateData.default_value = input.defaultValue;
    if (input.validationRegex !== undefined) updateData.validation_regex = input.validationRegex;
    if (input.resolutionStrategy) updateData.resolution_strategy = input.resolutionStrategy;
    if (input.sourceReference !== undefined) updateData.source_reference = input.sourceReference;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    // Update slot
    const { data: slot, error } = await supabase
      .from('prompt_slots')
      .update(updateData)
      .eq('id', slotId)
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating slot:', error);
      return res.status(500).json({ error: 'Failed to update slot' });
    }

    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    return res.json(slot);
  } catch (error) {
    console.error('Error in updatePromptSlot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete a prompt slot
 * DELETE /api/v1/prompt-templates/:templateId/slots/:slotId
 */
export async function deletePromptSlot(req: Request, res: Response) {
  try {
    const { templateId, slotId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Verify template exists and belongs to organization
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete slot
    const { error } = await supabase
      .from('prompt_slots')
      .delete()
      .eq('id', slotId)
      .eq('template_id', templateId);

    if (error) {
      console.error('Error deleting slot:', error);
      return res.status(500).json({ error: 'Failed to delete slot' });
    }

    return res.json({ success: true, message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error in deletePromptSlot:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
