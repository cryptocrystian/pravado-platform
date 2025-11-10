// =====================================================
// PLAYBOOKS API ROUTES
// Sprint 41 Phase 3.4 Days 3-6
// =====================================================

import express, { Request, Response } from 'express';
import { z } from 'zod';
import {
  createPlaybook,
  getPlaybookById,
  getPlaybookWithSteps,
  listPlaybooks,
  updatePlaybook,
  deletePlaybook,
  createPlaybookStep,
  getPlaybookSteps,
  updatePlaybookStep,
  deletePlaybookStep,
  createPlaybookExecution,
  getPlaybookExecution,
  getPlaybookExecutionWithResults,
  listPlaybookExecutions,
  getPlaybookExecutionSummary,
  getExecutionProgress,
} from '../services/playbookService';
import { executePlaybook } from '../services/playbookExecutionEngine';
import {
  CreatePlaybookInput,
  UpdatePlaybookInput,
  CreatePlaybookStepInput,
  UpdatePlaybookStepInput,
  ExecutePlaybookInput,
  PlaybookStatus,
  PlaybookStepType,
  TriggerSource,
} from '@pravado/types';

const router = express.Router();

// =====================================================
// PLAYBOOK ROUTES
// =====================================================

/**
 * POST /api/playbooks
 * Create a new playbook
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.auth!;

    const input = req.body as CreatePlaybookInput;

    const playbook = await createPlaybook(organizationId, userId, input);

    res.status(201).json({
      success: true,
      data: playbook,
    });
  } catch (error: any) {
    console.error('Create playbook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks
 * List playbooks with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;

    const filters = {
      status: req.query.status as PlaybookStatus,
      category: req.query.category as string,
      agentId: req.query.agentId as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      orderBy: req.query.orderBy as 'created_at' | 'updated_at' | 'name',
      orderDirection: req.query.orderDirection as 'asc' | 'desc',
    };

    const result = await listPlaybooks(organizationId, filters);

    res.json({
      success: true,
      data: result.playbooks,
      total: result.total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    console.error('List playbooks error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/:id
 * Get playbook by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { id } = req.params;

    const playbook = await getPlaybookById(id, organizationId);

    if (!playbook) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error: any) {
    console.error('Get playbook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/:id/with-steps
 * Get playbook with steps
 */
router.get('/:id/with-steps', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { id } = req.params;

    const playbook = await getPlaybookWithSteps(id, organizationId);

    if (!playbook) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error: any) {
    console.error('Get playbook with steps error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/playbooks/:id
 * Update playbook
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.auth!;
    const { id } = req.params;

    const input = req.body as UpdatePlaybookInput;

    const playbook = await updatePlaybook(id, organizationId, userId, input);

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error: any) {
    console.error('Update playbook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/playbooks/:id
 * Delete playbook
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { id } = req.params;

    await deletePlaybook(id, organizationId);

    res.json({
      success: true,
      message: 'Playbook deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete playbook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================================================
// PLAYBOOK STEP ROUTES
// =====================================================

/**
 * POST /api/playbooks/:id/steps
 * Create a playbook step
 */
router.post('/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = req.body as CreatePlaybookStepInput;

    const step = await createPlaybookStep(id, input);

    res.status(201).json({
      success: true,
      data: step,
    });
  } catch (error: any) {
    console.error('Create playbook step error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/:id/steps
 * Get playbook steps
 */
router.get('/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const steps = await getPlaybookSteps(id);

    res.json({
      success: true,
      data: steps,
    });
  } catch (error: any) {
    console.error('Get playbook steps error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/playbooks/steps/:stepId
 * Update playbook step
 */
router.patch('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const input = req.body as UpdatePlaybookStepInput;

    const step = await updatePlaybookStep(stepId, input);

    res.json({
      success: true,
      data: step,
    });
  } catch (error: any) {
    console.error('Update playbook step error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/playbooks/steps/:stepId
 * Delete playbook step
 */
router.delete('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    await deletePlaybookStep(stepId);

    res.json({
      success: true,
      message: 'Step deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete playbook step error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================================================
// PLAYBOOK EXECUTION ROUTES
// =====================================================

/**
 * POST /api/playbooks/:id/execute
 * Execute a playbook
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId } = req.auth!;
    const { id } = req.params;

    const input: ExecutePlaybookInput = {
      playbookId: id,
      executionName: req.body.executionName,
      inputData: req.body.inputData || {},
      triggerSource: req.body.triggerSource || TriggerSource.MANUAL,
      metadata: req.body.metadata,
    };

    // Create execution
    const execution = await createPlaybookExecution(organizationId, userId, input);

    // Start execution asynchronously (don't wait for completion)
    executePlaybook(execution, organizationId).catch((error) => {
      console.error('Playbook execution failed:', error);
    });

    res.status(202).json({
      success: true,
      data: execution,
      message: 'Playbook execution started',
    });
  } catch (error: any) {
    console.error('Execute playbook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/executions
 * List playbook executions
 */
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;

    const filters = {
      playbookId: req.query.playbookId as string,
      status: req.query.status as any,
      triggeredBy: req.query.triggeredBy as string,
      triggerSource: req.query.triggerSource as any,
      startedAfter: req.query.startedAfter as string,
      startedBefore: req.query.startedBefore as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      orderBy: req.query.orderBy as any,
      orderDirection: req.query.orderDirection as 'asc' | 'desc',
    };

    const result = await listPlaybookExecutions(organizationId, filters);

    res.json({
      success: true,
      data: result.executions,
      total: result.total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    console.error('List executions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/executions/:executionId
 * Get playbook execution
 */
router.get('/executions/:executionId', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { executionId } = req.params;

    const execution = await getPlaybookExecution(executionId, organizationId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    console.error('Get execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/executions/:executionId/with-results
 * Get playbook execution with results
 */
router.get('/executions/:executionId/with-results', async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.auth!;
    const { executionId } = req.params;

    const execution = await getPlaybookExecutionWithResults(executionId, organizationId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    console.error('Get execution with results error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/playbooks/executions/:executionId/progress
 * Get execution progress
 */
router.get('/executions/:executionId/progress', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    const progress = await getExecutionProgress(executionId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error('Get execution progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// =====================================================
// ANALYTICS ROUTES
// =====================================================

/**
 * GET /api/playbooks/:id/summary
 * Get playbook execution summary
 */
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const summary = await getPlaybookExecutionSummary(id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Get execution summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
