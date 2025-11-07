// =====================================================
// FOLLOWUP CONTROLLER - Automated Follow-Up API
// =====================================================

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { followupEngine } from '../../../agents/src/followup/followup-engine';
import type {
  CreateFollowupSequenceInput,
  UpdateFollowupSequenceInput,
  CreateFollowupStepInput,
  UpdateFollowupStepInput,
  GenerateFollowupsInput,
  RescheduleFollowupInput,
  CancelFollowupSequenceInput,
  ExecuteFollowupInput,
  GetDueFollowupsInput,
  ListFollowupSequencesQuery,
  ListScheduledFollowupsQuery,
} from '@pravado/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// SEQUENCE MANAGEMENT
// =====================================================

/**
 * Create followup sequence
 * POST /api/v1/followup/sequences
 */
export async function createSequence(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const input: Omit<CreateFollowupSequenceInput, 'organizationId'> = req.body;

    const { data, error } = await supabase
      .from('followup_sequences')
      .insert({
        ...input,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ success: true, sequence: data });
  } catch (error: any) {
    console.error('Create sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to create sequence' });
  }
}

/**
 * Update followup sequence
 * PUT /api/v1/followup/sequences/:sequenceId
 */
export async function updateSequence(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { sequenceId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const updates: Omit<UpdateFollowupSequenceInput, 'sequenceId' | 'organizationId'> =
      req.body;

    const { data, error } = await supabase
      .from('followup_sequences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sequenceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ success: true, sequence: data });
  } catch (error: any) {
    console.error('Update sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to update sequence' });
  }
}

/**
 * Get followup sequence with steps
 * GET /api/v1/followup/sequences/:sequenceId
 */
export async function getSequence(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { sequenceId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { data: sequence, error: seqError } = await supabase
      .from('followup_sequences')
      .select('*')
      .eq('id', sequenceId)
      .eq('organization_id', organizationId)
      .single();

    if (seqError) {
      throw seqError;
    }

    const { data: steps } = await supabase
      .from('followup_steps')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('step_number');

    res.json({
      success: true,
      sequence: {
        ...sequence,
        steps: steps || [],
      },
    });
  } catch (error: any) {
    console.error('Get sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sequence' });
  }
}

/**
 * List followup sequences
 * GET /api/v1/followup/sequences
 */
export async function listSequences(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { campaignId, isActive, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('followup_sequences')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId as string);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      sequences: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('List sequences error:', error);
    res.status(500).json({ error: error.message || 'Failed to list sequences' });
  }
}

/**
 * Delete followup sequence
 * DELETE /api/v1/followup/sequences/:sequenceId
 */
export async function deleteSequence(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { sequenceId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { error } = await supabase
      .from('followup_sequences')
      .delete()
      .eq('id', sequenceId)
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Sequence deleted' });
  } catch (error: any) {
    console.error('Delete sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete sequence' });
  }
}

// =====================================================
// STEP MANAGEMENT
// =====================================================

/**
 * Create followup step
 * POST /api/v1/followup/steps
 */
export async function createStep(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const input: Omit<CreateFollowupStepInput, 'organizationId'> = req.body;

    // Verify sequence belongs to organization
    const { data: sequence } = await supabase
      .from('followup_sequences')
      .select('id')
      .eq('id', input.sequenceId)
      .eq('organization_id', organizationId)
      .single();

    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const { data, error } = await supabase
      .from('followup_steps')
      .insert(input)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update sequence total_steps
    await supabase.rpc('update_sequence_total_steps', {
      p_sequence_id: input.sequenceId,
    });

    res.json({ success: true, step: data });
  } catch (error: any) {
    console.error('Create step error:', error);
    res.status(500).json({ error: error.message || 'Failed to create step' });
  }
}

/**
 * Update followup step
 * PUT /api/v1/followup/steps/:stepId
 */
export async function updateStep(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { stepId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const updates: Omit<UpdateFollowupStepInput, 'stepId' | 'organizationId'> = req.body;

    // Verify step belongs to organization's sequence
    const { data: step } = await supabase
      .from('followup_steps')
      .select('sequence_id')
      .eq('id', stepId)
      .single();

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    const { data: sequence } = await supabase
      .from('followup_sequences')
      .select('id')
      .eq('id', step.sequence_id)
      .eq('organization_id', organizationId)
      .single();

    if (!sequence) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('followup_steps')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stepId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ success: true, step: data });
  } catch (error: any) {
    console.error('Update step error:', error);
    res.status(500).json({ error: error.message || 'Failed to update step' });
  }
}

/**
 * Delete followup step
 * DELETE /api/v1/followup/steps/:stepId
 */
export async function deleteStep(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { stepId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    // Verify step belongs to organization's sequence
    const { data: step } = await supabase
      .from('followup_steps')
      .select('sequence_id')
      .eq('id', stepId)
      .single();

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    const { data: sequence } = await supabase
      .from('followup_sequences')
      .select('id')
      .eq('id', step.sequence_id)
      .eq('organization_id', organizationId)
      .single();

    if (!sequence) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase.from('followup_steps').delete().eq('id', stepId);

    if (error) {
      throw error;
    }

    // Update sequence total_steps
    await supabase.rpc('update_sequence_total_steps', {
      p_sequence_id: step.sequence_id,
    });

    res.json({ success: true, message: 'Step deleted' });
  } catch (error: any) {
    console.error('Delete step error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete step' });
  }
}

// =====================================================
// FOLLOWUP EXECUTION
// =====================================================

/**
 * Generate followups for campaign
 * POST /api/v1/followup/generate
 */
export async function generateFollowups(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const input: Omit<GenerateFollowupsInput, 'organizationId'> = req.body;

    const result = await followupEngine.generateFollowups({
      ...input,
      organizationId,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Generate followups error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate followups' });
  }
}

/**
 * Evaluate followup triggers
 * POST /api/v1/followup/evaluate/:followupId
 */
export async function evaluateTriggers(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { followupId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const evaluation = await followupEngine.evaluateTriggers({
      followupId,
      organizationId,
    });

    res.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Evaluate triggers error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate triggers' });
  }
}

/**
 * Reschedule followup
 * POST /api/v1/followup/reschedule/:followupId
 */
export async function rescheduleFollowup(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { followupId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { newScheduledAt, reason } = req.body;

    const success = await followupEngine.rescheduleFollowup({
      followupId,
      newScheduledAt,
      reason,
      organizationId,
    });

    res.json({ success, message: 'Followup rescheduled' });
  } catch (error: any) {
    console.error('Reschedule followup error:', error);
    res.status(500).json({ error: error.message || 'Failed to reschedule followup' });
  }
}

/**
 * Cancel followup sequence for contact
 * POST /api/v1/followup/cancel
 */
export async function cancelSequence(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const input: Omit<CancelFollowupSequenceInput, 'organizationId'> = req.body;

    const canceledCount = await followupEngine.cancelSequenceForContact({
      ...input,
      organizationId,
    });

    res.json({
      success: true,
      canceledCount,
      message: `Canceled ${canceledCount} followups`,
    });
  } catch (error: any) {
    console.error('Cancel sequence error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel sequence' });
  }
}

/**
 * Get due followups
 * GET /api/v1/followup/due
 */
export async function getDueFollowups(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { limit = 100 } = req.query;

    const followups = await followupEngine.getDueFollowups({
      organizationId,
      limit: Number(limit),
    });

    res.json({
      success: true,
      followups,
      count: followups.length,
    });
  } catch (error: any) {
    console.error('Get due followups error:', error);
    res.status(500).json({ error: error.message || 'Failed to get due followups' });
  }
}

/**
 * Execute single followup
 * POST /api/v1/followup/execute/:followupId
 */
export async function executeFollowup(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { followupId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { dryRun = false } = req.body;

    const result = await followupEngine.executeFollowup({
      followupId,
      organizationId,
      dryRun,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Execute followup error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute followup' });
  }
}

/**
 * Execute batch of due followups
 * POST /api/v1/followup/execute-batch
 */
export async function executeBatch(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const { limit = 50 } = req.body;

    const result = await followupEngine.executeBatch({
      organizationId,
      limit,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Execute batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute batch' });
  }
}

// =====================================================
// ANALYTICS
// =====================================================

/**
 * Get sequence summary
 * GET /api/v1/followup/sequences/:sequenceId/summary
 */
export async function getSequenceSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { sequenceId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const summary = await followupEngine.getSequenceSummary(sequenceId, organizationId);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Get sequence summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sequence summary' });
  }
}

/**
 * Get contact followup status
 * GET /api/v1/followup/contacts/:contactId/status
 */
export async function getContactStatus(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { contactId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const status = await followupEngine.getContactStatus(contactId, organizationId);

    res.json({ success: true, status });
  } catch (error: any) {
    console.error('Get contact status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get contact status' });
  }
}

/**
 * List scheduled followups
 * GET /api/v1/followup/scheduled
 */
export async function listScheduledFollowups(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;

    if (!organizationId) {
      return res.status(403).json({ error: 'No organization context' });
    }

    const {
      campaignId,
      sequenceId,
      contactId,
      status,
      scheduledBefore,
      scheduledAfter,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = supabase
      .from('scheduled_followups')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (campaignId) query = query.eq('campaign_id', campaignId as string);
    if (sequenceId) query = query.eq('sequence_id', sequenceId as string);
    if (contactId) query = query.eq('contact_id', contactId as string);
    if (status) query = query.eq('status', status as string);
    if (scheduledBefore) query = query.lte('scheduled_at', scheduledBefore as string);
    if (scheduledAfter) query = query.gte('scheduled_at', scheduledAfter as string);

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      followups: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('List scheduled followups error:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to list scheduled followups' });
  }
}
