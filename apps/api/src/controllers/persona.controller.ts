// =====================================================
// PERSONA CONTROLLER
// Sprint 31: Persona intelligence & adaptive voice modeling
// =====================================================

import { Request, Response } from 'express';
import { personaEngine } from '../../../agents/src/persona/persona-engine';
import { createClient } from '@supabase/supabase-js';
import type {
  CreatePersonaDefinitionInput,
  UpdatePersonaDefinitionInput,
  InferPersonaInput,
  OverridePersonaInput,
  OverrideToneInput,
  UpdatePersonaFromEngagementInput,
  GetAdaptiveStrategyInput,
} from '@pravado/types';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// =====================================================
// PERSONA DEFINITION ENDPOINTS
// =====================================================

/**
 * Get all persona definitions
 * GET /api/v1/personas
 */
export async function getPersonas(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabase
      .from('persona_definitions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get personas: ${error.message}`);
    }

    const personas = (data || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      defaultTone: d.default_tone,
      defaultVoice: d.default_voice,
      characteristics: d.characteristics,
      doList: d.do_list,
      dontList: d.dont_list,
      examplePhrases: d.example_phrases,
      isSystemPersona: d.is_system_persona,
      isActive: d.is_active,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    res.json({ success: true, personas, total: personas.length });
  } catch (error: any) {
    console.error('Get personas error:', error);
    res.status(500).json({ error: error.message || 'Failed to get personas' });
  }
}

/**
 * Get single persona definition
 * GET /api/v1/personas/:personaId
 */
export async function getPersona(req: Request, res: Response) {
  try {
    const { personaId } = req.params;

    const { data, error } = await supabase
      .from('persona_definitions')
      .select('*')
      .eq('id', personaId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    const persona = {
      id: data.id,
      name: data.name,
      description: data.description,
      defaultTone: data.default_tone,
      defaultVoice: data.default_voice,
      characteristics: data.characteristics,
      doList: data.do_list,
      dontList: data.dont_list,
      examplePhrases: data.example_phrases,
      isSystemPersona: data.is_system_persona,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    res.json({ success: true, persona });
  } catch (error: any) {
    console.error('Get persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to get persona' });
  }
}

/**
 * Create new persona definition
 * POST /api/v1/personas
 */
export async function createPersona(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreatePersonaDefinitionInput = {
      ...req.body,
      organizationId,
    };

    const { data, error } = await supabase
      .from('persona_definitions')
      .insert({
        name: input.name,
        description: input.description,
        default_tone: input.defaultTone,
        default_voice: input.defaultVoice || 'CONVERSATIONAL',
        characteristics: input.characteristics,
        do_list: input.doList,
        dont_list: input.dontList,
        example_phrases: input.examplePhrases || [],
        is_system_persona: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create persona: ${error.message}`);
    }

    res.json({ success: true, persona: data });
  } catch (error: any) {
    console.error('Create persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to create persona' });
  }
}

/**
 * Update persona definition
 * PUT /api/v1/personas/:personaId
 */
export async function updatePersona(req: Request, res: Response) {
  try {
    const { personaId } = req.params;
    const input: UpdatePersonaDefinitionInput = req.body;

    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.defaultTone !== undefined) updateData.default_tone = input.defaultTone;
    if (input.defaultVoice !== undefined) updateData.default_voice = input.defaultVoice;
    if (input.characteristics !== undefined) updateData.characteristics = input.characteristics;
    if (input.doList !== undefined) updateData.do_list = input.doList;
    if (input.dontList !== undefined) updateData.dont_list = input.dontList;
    if (input.examplePhrases !== undefined) updateData.example_phrases = input.examplePhrases;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await supabase
      .from('persona_definitions')
      .update(updateData)
      .eq('id', personaId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update persona: ${error.message}`);
    }

    res.json({ success: true, persona: data });
  } catch (error: any) {
    console.error('Update persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to update persona' });
  }
}

/**
 * Delete persona definition (soft delete)
 * DELETE /api/v1/personas/:personaId
 */
export async function deletePersona(req: Request, res: Response) {
  try {
    const { personaId } = req.params;

    // Check if it's a system persona
    const { data: persona } = await supabase
      .from('persona_definitions')
      .select('is_system_persona')
      .eq('id', personaId)
      .single();

    if (persona?.is_system_persona) {
      return res.status(403).json({ error: 'Cannot delete system personas' });
    }

    // Soft delete
    const { error } = await supabase
      .from('persona_definitions')
      .update({ is_active: false })
      .eq('id', personaId);

    if (error) {
      throw new Error(`Failed to delete persona: ${error.message}`);
    }

    res.json({ success: true, message: 'Persona deleted successfully' });
  } catch (error: any) {
    console.error('Delete persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete persona' });
  }
}

// =====================================================
// CONTACT PERSONA ENDPOINTS
// =====================================================

/**
 * Get contact's persona profile
 * GET /api/v1/contacts/:contactId/persona
 */
export async function getContactPersona(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const profile = await personaEngine.getContactPersonaProfile(contactId, organizationId);

    if (!profile) {
      return res.status(404).json({ error: 'No persona assigned to this contact' });
    }

    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Get contact persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to get contact persona' });
  }
}

/**
 * Infer persona for a contact
 * POST /api/v1/contacts/:contactId/persona/infer
 */
export async function inferContactPersona(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { forceRefresh } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: InferPersonaInput = {
      contactId,
      organizationId,
      forceRefresh: forceRefresh ?? false,
    };

    const result = await personaEngine.inferPersona(input);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Infer persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to infer persona' });
  }
}

/**
 * Override/manually set persona for contact
 * PUT /api/v1/contacts/:contactId/persona
 */
export async function overrideContactPersona(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { personaId, reason } = req.body;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: OverridePersonaInput = {
      contactId,
      organizationId,
      personaId,
      reason,
      setBy: userId,
    };

    const profile = await personaEngine.overridePersona(input);

    res.json({ success: true, profile, message: 'Persona overridden successfully' });
  } catch (error: any) {
    console.error('Override persona error:', error);
    res.status(500).json({ error: error.message || 'Failed to override persona' });
  }
}

/**
 * Override tone/voice preference for contact
 * PUT /api/v1/contacts/:contactId/tone
 */
export async function overrideToneVoice(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { preferredTone, preferredVoice, reason, appliesToCampaigns } = req.body;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: OverrideToneInput = {
      contactId,
      organizationId,
      preferredTone,
      preferredVoice,
      reason,
      appliesToCampaigns,
      setBy: userId,
    };

    await personaEngine.overrideToneVoice(input);

    res.json({ success: true, message: 'Tone/voice preference saved successfully' });
  } catch (error: any) {
    console.error('Override tone/voice error:', error);
    res.status(500).json({ error: error.message || 'Failed to override tone/voice' });
  }
}

/**
 * Update persona based on engagement feedback
 * POST /api/v1/contacts/:contactId/persona/engagement
 */
export async function updateFromEngagement(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { interactionType, sentimentScore, responsePositive, campaignId } = req.body;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdatePersonaFromEngagementInput = {
      contactId,
      organizationId,
      interactionType,
      sentimentScore,
      responsePositive,
      campaignId,
    };

    const updated = await personaEngine.updateFromEngagement(input);

    res.json({ success: true, updated });
  } catch (error: any) {
    console.error('Update from engagement error:', error);
    res.status(500).json({ error: error.message || 'Failed to update persona from engagement' });
  }
}

// =====================================================
// STRATEGY ENDPOINTS
// =====================================================

/**
 * Get adaptive strategy for contact
 * GET /api/v1/contacts/:contactId/adaptive-strategy
 */
export async function getAdaptiveStrategy(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { useCaseTag } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetAdaptiveStrategyInput = {
      contactId,
      organizationId,
      useCaseTag: useCaseTag as string | undefined,
    };

    const strategy = await personaEngine.getAdaptiveStrategy(input);

    res.json({ success: true, strategy });
  } catch (error: any) {
    console.error('Get adaptive strategy error:', error);
    res.status(500).json({ error: error.message || 'Failed to get adaptive strategy' });
  }
}

/**
 * Get persona strategy by ID
 * GET /api/v1/personas/:personaId/strategy
 */
export async function getPersonaStrategy(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { personaId } = req.params;
    const { useCaseTag } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    let query = supabase
      .from('persona_strategies')
      .select('*')
      .eq('persona_id', personaId);

    if (useCaseTag) {
      query = query.eq('use_case_tag', useCaseTag);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(404).json({ error: 'Persona strategy not found' });
    }

    const strategy = {
      id: data.id,
      personaId: data.persona_id,
      recommendedTone: data.recommended_tone,
      recommendedVoice: data.recommended_voice,
      strategyName: data.strategy_name,
      strategyNotes: data.strategy_notes,
      contentStructure: data.content_structure,
      messagingFocus: data.messaging_focus,
      optimalEmailLength: data.optimal_email_length,
      preferredCtaStyle: data.preferred_cta_style,
      useCaseTag: data.use_case_tag,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    res.json({ success: true, strategy });
  } catch (error: any) {
    console.error('Get persona strategy error:', error);
    res.status(500).json({ error: error.message || 'Failed to get persona strategy' });
  }
}

// =====================================================
// EVENT LOG ENDPOINTS
// =====================================================

/**
 * Get persona event log for a contact
 * GET /api/v1/contacts/:contactId/persona/events
 */
export async function getPersonaEvents(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const { data, error, count } = await supabase
      .from('persona_event_log')
      .select('*', { count: 'exact' })
      .eq('contact_id', contactId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw new Error(`Failed to get persona events: ${error.message}`);
    }

    const events = (data || []).map((d) => ({
      id: d.id,
      organizationId: d.organization_id,
      contactId: d.contact_id,
      eventType: d.event_type,
      oldPersonaId: d.old_persona_id,
      newPersonaId: d.new_persona_id,
      oldConfidence: d.old_confidence,
      newConfidence: d.new_confidence,
      triggerSource: d.trigger_source,
      campaignId: d.campaign_id,
      initiatedBy: d.initiated_by,
      reason: d.reason,
      metadata: d.metadata,
      createdAt: d.created_at,
    }));

    res.json({ success: true, events, total: count || 0 });
  } catch (error: any) {
    console.error('Get persona events error:', error);
    res.status(500).json({ error: error.message || 'Failed to get persona events' });
  }
}
