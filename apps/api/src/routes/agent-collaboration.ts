// =====================================================
// AGENT COLLABORATION API ROUTES
// Sprint 43 Phase 3.5.2
// =====================================================

import { Router, Request, Response } from 'express';
import { agentCollaborationOrchestrator } from '../services/agentCollaborationOrchestrator';
import { supabase } from '../config/supabase';
import {
  EscalationRequest,
  DelegationRequest,
  CollaborationRequest,
} from '@pravado/types';

const router = Router();

// =====================================================
// ESCALATION
// =====================================================

/**
 * POST /api/agent-collaboration/escalate
 * Escalate a task to a higher-permission agent
 */
router.post('/escalate', async (req: Request, res: Response) => {
  try {
    const escalationRequest: EscalationRequest = req.body;

    // Validate request
    if (!escalationRequest.agentId) {
      return res.status(400).json({
        error: 'Missing required field: agentId',
      });
    }

    if (!escalationRequest.organizationId) {
      return res.status(400).json({
        error: 'Missing required field: organizationId',
      });
    }

    if (!escalationRequest.taskContext) {
      return res.status(400).json({
        error: 'Missing required field: taskContext',
      });
    }

    // Execute escalation
    const result = await agentCollaborationOrchestrator.escalateTaskToAgent(
      escalationRequest
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /escalate:', error);
    return res.status(500).json({
      error: 'Failed to escalate task',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// DELEGATION
// =====================================================

/**
 * POST /api/agent-collaboration/delegate
 * Delegate a task to a specialized agent
 */
router.post('/delegate', async (req: Request, res: Response) => {
  try {
    const delegationRequest: DelegationRequest = req.body;

    // Validate request
    if (!delegationRequest.delegatingAgentId) {
      return res.status(400).json({
        error: 'Missing required field: delegatingAgentId',
      });
    }

    if (!delegationRequest.organizationId) {
      return res.status(400).json({
        error: 'Missing required field: organizationId',
      });
    }

    if (!delegationRequest.task) {
      return res.status(400).json({
        error: 'Missing required field: task',
      });
    }

    if (!delegationRequest.mode) {
      return res.status(400).json({
        error: 'Missing required field: mode (synchronous or asynchronous)',
      });
    }

    // Execute delegation
    const result = await agentCollaborationOrchestrator.delegateTaskToAgent(
      delegationRequest
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /delegate:', error);
    return res.status(500).json({
      error: 'Failed to delegate task',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// COORDINATION
// =====================================================

/**
 * POST /api/agent-collaboration/coordinate
 * Coordinate multiple agents on a workflow
 */
router.post('/coordinate', async (req: Request, res: Response) => {
  try {
    const coordinationRequest: CollaborationRequest = req.body;

    // Validate request
    if (!coordinationRequest.initiatingAgentId) {
      return res.status(400).json({
        error: 'Missing required field: initiatingAgentId',
      });
    }

    if (!coordinationRequest.organizationId) {
      return res.status(400).json({
        error: 'Missing required field: organizationId',
      });
    }

    if (!coordinationRequest.workflow) {
      return res.status(400).json({
        error: 'Missing required field: workflow',
      });
    }

    // Execute coordination
    const result = await agentCollaborationOrchestrator.coordinateAgentsOnWorkflow(
      coordinationRequest
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /coordinate:', error);
    return res.status(500).json({
      error: 'Failed to coordinate agents',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================================
// COLLABORATION LOGS
// =====================================================

/**
 * GET /api/agent-collaboration/logs/:agentId
 * Get collaboration logs for an agent
 */
router.get('/logs/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    let query = supabase
      .from('agent_collaboration_logs')
      .select('*', { count: 'exact' })
      .or(`initiating_agent_id.eq.${agentId},target_agent_ids.cs.{${agentId}}`)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Filter by collaboration type if specified
    if (type) {
      query = query.eq('collaboration_type', type);
    }

    const { data, error, count } = await query;

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
      error: 'Failed to fetch collaboration logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/logs/:agentId/:logId
 * Get a specific collaboration log
 */
router.get('/logs/:agentId/:logId', async (req: Request, res: Response) => {
  try {
    const { agentId, logId } = req.params;

    const { data, error } = await supabase
      .from('agent_collaboration_logs')
      .select('*')
      .eq('id', logId)
      .or(`initiating_agent_id.eq.${agentId},target_agent_ids.cs.{${agentId}}`)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        error: 'Collaboration log not found',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in /logs/:agentId/:logId:', error);
    return res.status(500).json({
      error: 'Failed to fetch collaboration log',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/stats/:agentId
 * Get collaboration statistics for an agent
 */
router.get('/stats/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { days = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_agent_collaboration_stats', {
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
      error: 'Failed to fetch agent statistics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/trends/:organizationId
 * Get collaboration trends for an organization
 */
router.get('/trends/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { days = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_organization_collaboration_trends', {
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
      error: 'Failed to fetch collaboration trends',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/escalation-patterns/:organizationId
 * Get escalation patterns (who escalates to whom)
 */
router.get('/escalation-patterns/:organizationId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { days = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_escalation_patterns', {
        p_organization_id: organizationId,
        p_days: Number(days),
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      patterns: data,
      period: {
        days: Number(days),
        startDate: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in /escalation-patterns/:organizationId:', error);
    return res.status(500).json({
      error: 'Failed to fetch escalation patterns',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/workload/:agentId
 * Get current workload for an agent
 */
router.get('/workload/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const { data, error } = await supabase
      .rpc('get_agent_workload', {
        p_agent_id: agentId,
      });

    if (error) {
      throw error;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in /workload/:agentId:', error);
    return res.status(500).json({
      error: 'Failed to fetch agent workload',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agent-collaboration/recent/:agentId
 * Get recent collaborations for an agent
 */
router.get('/recent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .rpc('get_recent_agent_collaborations', {
        p_agent_id: agentId,
        p_limit: Number(limit),
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      collaborations: data,
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Error in /recent/:agentId:', error);
    return res.status(500).json({
      error: 'Failed to fetch recent collaborations',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
