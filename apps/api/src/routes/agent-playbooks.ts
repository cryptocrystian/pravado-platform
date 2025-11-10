// =====================================================
// AGENT PLAYBOOK ORCHESTRATION API ROUTES
// Sprint 43 Phase 3.5.1
// =====================================================

import { Router, Request, Response } from 'express';
import { agentPlaybookOrchestrator } from '../services/agentPlaybookOrchestrator';
import { supabase } from '../config/supabase';
import {
  PlaybookSelectionRequest,
  TriggerPlaybookRequest,
  PlaybookChainConfig,
} from '@pravado/types';

const router = Router();

// =====================================================
// PLAYBOOK SELECTION
// =====================================================

/**
 * POST /api/agent-playbooks/select
 * Select the most relevant playbook for an agent context
 */
router.post('/select', async (req: Request, res: Response) => {
  try {
    const selectionRequest: PlaybookSelectionRequest = req.body;

    // Validate request
    if (!selectionRequest.context) {
      return res.status(400).json({
        error: 'Missing required field: context',
      });
    }

    if (!selectionRequest.context.agentId) {
      return res.status(400).json({
        error: 'Missing required field: context.agentId',
      });
    }

    if (!selectionRequest.context.organizationId) {
      return res.status(400).json({
        error: 'Missing required field: context.organizationId',
      });
    }

    if (!selectionRequest.context.userPrompt) {
      return res.status(400).json({
        error: 'Missing required field: context.userPrompt',
      });
    }

    // Select playbook
    const selectionResponse = await agentPlaybookOrchestrator.selectRelevantPlaybook(
      selectionRequest
    );

    return res.status(200).json(selectionResponse);
  } catch (error) {
    console.error('Error in /select:', error);
    return res.status(500).json({
      error: 'Failed to select playbook',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// PLAYBOOK TRIGGERING
// =====================================================

/**
 * POST /api/agent-playbooks/trigger
 * Auto-select and trigger a playbook for an agent
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const triggerRequest: TriggerPlaybookRequest = req.body;

    // Validate request
    if (!triggerRequest.agentId) {
      return res.status(400).json({
        error: 'Missing required field: agentId',
      });
    }

    if (!triggerRequest.userPrompt) {
      return res.status(400).json({
        error: 'Missing required field: userPrompt',
      });
    }

    // Trigger playbook
    const executionResult = await agentPlaybookOrchestrator.triggerPlaybookForAgent(
      triggerRequest
    );

    return res.status(200).json(executionResult);
  } catch (error) {
    console.error('Error in /trigger:', error);
    return res.status(500).json({
      error: 'Failed to trigger playbook',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// PLAYBOOK CHAINING
// =====================================================

/**
 * POST /api/agent-playbooks/chain
 * Execute multiple playbooks in sequence
 */
router.post('/chain', async (req: Request, res: Response) => {
  try {
    const chainConfig: PlaybookChainConfig = req.body;

    // Validate request
    if (!chainConfig.playbooks || !Array.isArray(chainConfig.playbooks)) {
      return res.status(400).json({
        error: 'Missing required field: playbooks (must be array)',
      });
    }

    if (chainConfig.playbooks.length === 0) {
      return res.status(400).json({
        error: 'At least one playbook must be specified',
      });
    }

    // Validate each playbook config
    for (const pb of chainConfig.playbooks) {
      if (!pb.playbookId) {
        return res.status(400).json({
          error: 'Each playbook must have a playbookId',
        });
      }
    }

    // Execute chain
    const executionResult = await agentPlaybookOrchestrator.chainPlaybookExecutions(
      chainConfig
    );

    return res.status(200).json(executionResult);
  } catch (error) {
    console.error('Error in /chain:', error);
    return res.status(500).json({
      error: 'Failed to execute playbook chain',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// DECISION LOGS
// =====================================================

/**
 * GET /api/agent-playbooks/logs/:agentId
 * Get decision logs for an agent
 */
router.get('/logs/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error, count } = await supabase
      .from('agent_playbook_logs')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      logs: data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error in /logs/:agentId:', error);
    return res.status(500).json({
      error: 'Failed to fetch decision logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-playbooks/logs/:agentId/:logId
 * Get a specific decision log
 */
router.get('/logs/:agentId/:logId', async (req: Request, res: Response) => {
  try {
    const { agentId, logId } = req.params;

    const { data, error } = await supabase
      .from('agent_playbook_logs')
      .select('*')
      .eq('id', logId)
      .eq('agent_id', agentId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        error: 'Decision log not found',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in /logs/:agentId/:logId:', error);
    return res.status(500).json({
      error: 'Failed to fetch decision log',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-playbooks/stats/:agentId
 * Get playbook selection statistics for an agent
 */
router.get('/stats/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { days = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_agent_playbook_stats', {
        p_agent_id: agentId,
        p_start_date: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in /stats/:agentId:', error);
    return res.status(500).json({
      error: 'Failed to fetch agent stats',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-playbooks/trends/:organizationId
 * Get playbook selection trends for an organization
 */
router.get('/trends/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { days = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_playbook_selection_trends', {
        p_organization_id: organizationId,
        p_days: Number(days),
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      trends: data,
      period: {
        days: Number(days),
        startDate: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in /trends/:organizationId:', error);
    return res.status(500).json({
      error: 'Failed to fetch selection trends',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-playbooks/recent-decisions/:agentId
 * Get recent playbook selection decisions for an agent
 */
router.get('/recent-decisions/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .rpc('get_recent_agent_decisions', {
        p_agent_id: agentId,
        p_limit: Number(limit),
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      decisions: data,
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Error in /recent-decisions/:agentId:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent decisions',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
