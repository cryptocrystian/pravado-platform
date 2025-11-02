// =====================================================
// AGENT EVALUATOR CONTROLLER
// Sprint 35: Agent performance evaluation framework
// =====================================================

import { Request, Response } from 'express';
import { agentEvaluatorEngine } from '../../../agents/src/evaluator/agent-evaluator';
import type {
  EvaluateRunInput,
  SummarizeEvaluationInput,
  UpdateEvaluationInput,
  LogEvaluationEventInput,
  CreateEvaluationTemplateInput,
  UpdateEvaluationTemplateInput,
  GetEvaluationsInput,
  GetEvaluationEventsInput,
  GetEvaluationDashboardInput,
  RecommendImprovementsInput,
  GetTemplatesInput,
} from '@pravado/shared-types';

// =====================================================
// EVALUATION ENDPOINTS
// =====================================================

/**
 * Evaluate agent run
 * POST /api/v1/agent-evaluator/evaluate
 */
export async function evaluateRun(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: EvaluateRunInput = {
      ...req.body,
      organizationId,
      evaluatedBy: userId,
    };

    const evaluationId = await agentEvaluatorEngine.evaluateRun(input);

    res.json({ success: true, evaluationId });
  } catch (error: any) {
    console.error('Evaluate run error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate run' });
  }
}

/**
 * Update evaluation
 * PUT /api/v1/agent-evaluator/evaluations/:evaluationId
 */
export async function updateEvaluation(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateEvaluationInput = {
      ...req.body,
      evaluationId,
    };

    const evaluation = await agentEvaluatorEngine.updateEvaluation(input);

    res.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Update evaluation error:', error);
    res.status(500).json({ error: error.message || 'Failed to update evaluation' });
  }
}

/**
 * Get evaluations
 * GET /api/v1/agent-evaluator/evaluations
 */
export async function getEvaluations(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const {
      agentRunId,
      campaignId,
      contactId,
      source,
      status,
      templateId,
      minScore,
      maxScore,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetEvaluationsInput = {
      organizationId,
      agentRunId: agentRunId as string | undefined,
      campaignId: campaignId as string | undefined,
      contactId: contactId as string | undefined,
      source: source as any,
      status: status as any,
      templateId: templateId as string | undefined,
      minScore: minScore ? parseFloat(minScore as string) : undefined,
      maxScore: maxScore ? parseFloat(maxScore as string) : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await agentEvaluatorEngine.getEvaluations(input);

    res.json({ success: true, evaluations: result.evaluations, total: result.total });
  } catch (error: any) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ error: error.message || 'Failed to get evaluations' });
  }
}

/**
 * Get evaluation by ID
 * GET /api/v1/agent-evaluator/evaluations/:evaluationId
 */
export async function getEvaluationById(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const evaluation = await agentEvaluatorEngine.getEvaluationById(organizationId, evaluationId);

    res.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ error: error.message || 'Failed to get evaluation' });
  }
}

/**
 * Log evaluation event
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/events
 */
export async function logEvaluationEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: LogEvaluationEventInput = {
      ...req.body,
      evaluationId,
      triggeredBy: userId,
    };

    const eventId = await agentEvaluatorEngine.logEvaluationEvent(input);

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('Log evaluation event error:', error);
    res.status(500).json({ error: error.message || 'Failed to log evaluation event' });
  }
}

/**
 * Get evaluation events
 * GET /api/v1/agent-evaluator/evaluations/:evaluationId/events
 */
export async function getEvaluationEvents(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;
    const { eventType, limit, offset } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetEvaluationEventsInput = {
      evaluationId,
      eventType: eventType as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await agentEvaluatorEngine.getEvaluationEvents(input);

    res.json({ success: true, events: result.events, total: result.total });
  } catch (error: any) {
    console.error('Get evaluation events error:', error);
    res.status(500).json({ error: error.message || 'Failed to get evaluation events' });
  }
}

// =====================================================
// TEMPLATE ENDPOINTS
// =====================================================

/**
 * Create evaluation template
 * POST /api/v1/agent-evaluator/templates
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: CreateEvaluationTemplateInput = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const templateId = await agentEvaluatorEngine.createTemplate(input);

    res.json({ success: true, templateId });
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
}

/**
 * Update evaluation template
 * PUT /api/v1/agent-evaluator/templates/:templateId
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { templateId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: UpdateEvaluationTemplateInput = {
      ...req.body,
      templateId,
    };

    const template = await agentEvaluatorEngine.updateTemplate(input);

    res.json({ success: true, template });
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
}

/**
 * Get evaluation templates
 * GET /api/v1/agent-evaluator/templates
 */
export async function getTemplates(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { isActive, isDefault, applicableTo } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetTemplatesInput = {
      organizationId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isDefault: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,
      applicableTo: applicableTo as string | undefined,
    };

    const templates = await agentEvaluatorEngine.getTemplates(input);

    res.json({ success: true, templates });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to get templates' });
  }
}

// =====================================================
// AI-POWERED INSIGHTS ENDPOINTS
// =====================================================

/**
 * Summarize evaluation (GPT-4)
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/summarize
 */
export async function summarizeEvaluation(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: SummarizeEvaluationInput = {
      organizationId,
      evaluationId,
    };

    const summary = await agentEvaluatorEngine.summarizeEvaluation(input);

    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize evaluation error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize evaluation' });
  }
}

/**
 * Recommend agent improvements (GPT-4)
 * POST /api/v1/agent-evaluator/evaluations/:evaluationId/improvements
 */
export async function recommendImprovements(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { evaluationId } = req.params;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: RecommendImprovementsInput = {
      organizationId,
      evaluationId,
    };

    const recommendations = await agentEvaluatorEngine.recommendAgentImprovements(input);

    res.json({ success: true, recommendations });
  } catch (error: any) {
    console.error('Recommend improvements error:', error);
    res.status(500).json({ error: error.message || 'Failed to recommend improvements' });
  }
}

// =====================================================
// DASHBOARD ENDPOINTS
// =====================================================

/**
 * Get evaluation dashboard
 * GET /api/v1/agent-evaluator/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organization_id;
    const { campaignId, periodStart, periodEnd } = req.query;

    if (!organizationId) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const input: GetEvaluationDashboardInput = {
      organizationId,
      campaignId: campaignId as string | undefined,
      periodStart: periodStart as string | undefined,
      periodEnd: periodEnd as string | undefined,
    };

    const dashboard = await agentEvaluatorEngine.getEvaluatorDashboard(input);

    res.json({ success: true, dashboard });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard' });
  }
}
