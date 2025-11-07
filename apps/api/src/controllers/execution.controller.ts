// =====================================================
// EXECUTION CONTROLLER - DAG Execution API
// =====================================================

import { Request, Response } from 'express';
import { GraphRunner } from '../../../agents/src/flows/graph-runner';
import { supabase } from '../lib/supabase';
import type {
  StartExecutionRequest,
  GraphRunnerConfig,
  ExecutionSummary,
  CampaignTaskGraph,
  CampaignTaskExecution,
  TaskExecutionLog,
} from '@pravado/types';

// Store active graph runners
const activeRunners = new Map<string, GraphRunner>();

/**
 * Start campaign execution
 * POST /api/v1/execution/:campaignId/start
 */
export async function startExecution(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;
    const request: StartExecutionRequest = {
      campaignId,
      organizationId,
      parallelism: req.body.parallelism,
      dryRun: req.body.dryRun,
    };

    // Check if already running
    if (activeRunners.has(campaignId)) {
      return res.status(409).json({ error: 'Execution already running' });
    }

    // Get executable tasks count
    const { data: executableTasks, error: tasksError } = await supabase.rpc(
      'get_executable_tasks',
      {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      }
    );

    if (tasksError) {
      throw new Error(`Failed to get executable tasks: ${tasksError.message}`);
    }

    // Get summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_execution_summary',
      {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      }
    );

    if (summaryError) {
      throw new Error(`Failed to get summary: ${summaryError.message}`);
    }

    const summary: ExecutionSummary = {
      campaignId: summaryData.campaign_id,
      totalTasks: summaryData.total_tasks,
      pending: summaryData.pending,
      running: summaryData.running,
      completed: summaryData.completed,
      failed: summaryData.failed,
      blocked: summaryData.blocked,
      skipped: summaryData.skipped,
      progress: parseFloat(summaryData.progress),
      isComplete: summaryData.is_complete,
      hasFailures: summaryData.has_failures,
    };

    if (request.dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        executableTasks: executableTasks?.length || 0,
        summary,
      });
    }

    // Create and start graph runner
    const config: GraphRunnerConfig = {
      campaignId,
      organizationId,
      parallelism: request.parallelism,
    };

    const runner = new GraphRunner(config);

    // Set up event listeners
    runner.on('graph-completed', () => {
      activeRunners.delete(campaignId);
    });

    runner.on('graph-failed', () => {
      activeRunners.delete(campaignId);
    });

    runner.on('execution-stopped', () => {
      activeRunners.delete(campaignId);
    });

    // Load and start
    await runner.loadGraph();
    await runner.start();

    activeRunners.set(campaignId, runner);

    res.json({
      success: true,
      started: true,
      executableTasks: executableTasks?.length || 0,
      summary,
    });
  } catch (error: any) {
    console.error('startExecution error:', error);
    res.status(500).json({
      error: error.message || 'Failed to start execution',
    });
  }
}

/**
 * Get execution status
 * GET /api/v1/execution/:campaignId/status
 */
export async function getExecutionStatus(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    // Get summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_execution_summary',
      {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      }
    );

    if (summaryError) {
      throw new Error(`Failed to get summary: ${summaryError.message}`);
    }

    const summary: ExecutionSummary = {
      campaignId: summaryData.campaign_id,
      totalTasks: summaryData.total_tasks,
      pending: summaryData.pending,
      running: summaryData.running,
      completed: summaryData.completed,
      failed: summaryData.failed,
      blocked: summaryData.blocked,
      skipped: summaryData.skipped,
      progress: parseFloat(summaryData.progress),
      isComplete: summaryData.is_complete,
      hasFailures: summaryData.has_failures,
    };

    // Get tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('campaign_task_graph')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at');

    if (tasksError) {
      throw new Error(`Failed to get tasks: ${tasksError.message}`);
    }

    // Get recent executions
    const { data: executions, error: executionsError } = await supabase
      .from('campaign_task_executions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (executionsError) {
      throw new Error(`Failed to get executions: ${executionsError.message}`);
    }

    // Get executable tasks
    const { data: executableTasks, error: executableError } = await supabase.rpc(
      'get_executable_tasks',
      {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      }
    );

    if (executableError) {
      throw new Error(`Failed to get executable tasks: ${executableError.message}`);
    }

    // Determine if running
    const isRunning =
      activeRunners.has(campaignId) || (summary.running > 0 && !summary.isComplete);

    res.json({
      success: true,
      campaignId,
      summary,
      tasks: tasks || [],
      recentExecutions: executions || [],
      executableTasks: executableTasks || [],
      isRunning,
      startedAt: null, // TODO: Track start time
      completedAt: summary.isComplete ? new Date() : null,
    });
  } catch (error: any) {
    console.error('getExecutionStatus error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get execution status',
    });
  }
}

/**
 * Retry failed task
 * POST /api/v1/execution/:campaignId/retry/:nodeId
 */
export async function retryTask(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId, nodeId } = req.params;

    // Reset task for retry
    const { data, error } = await supabase.rpc('reset_task_for_retry', {
      p_campaign_id: campaignId,
      p_node_id: nodeId,
      p_organization_id: organizationId,
    });

    if (error) {
      throw new Error(`Failed to reset task: ${error.message}`);
    }

    if (!data) {
      return res.status(400).json({ error: 'Max retries exceeded or task not found' });
    }

    // If there's an active runner, reload its graph
    const runner = activeRunners.get(campaignId);
    if (runner) {
      await runner.loadGraph();
    }

    res.json({
      success: true,
      nodeId,
      message: 'Task reset for retry',
    });
  } catch (error: any) {
    console.error('retryTask error:', error);
    res.status(500).json({
      error: error.message || 'Failed to retry task',
    });
  }
}

/**
 * Skip blocked task
 * POST /api/v1/execution/:campaignId/skip/:nodeId
 */
export async function skipTask(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId, nodeId } = req.params;
    const { reason } = req.body;

    // Skip task
    const { data, error } = await supabase.rpc('skip_task', {
      p_campaign_id: campaignId,
      p_node_id: nodeId,
      p_organization_id: organizationId,
      p_reason: reason || 'Task skipped by user',
    });

    if (error) {
      throw new Error(`Failed to skip task: ${error.message}`);
    }

    // If there's an active runner, reload its graph
    const runner = activeRunners.get(campaignId);
    if (runner) {
      await runner.loadGraph();
    }

    res.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('skipTask error:', error);
    res.status(500).json({
      error: error.message || 'Failed to skip task',
    });
  }
}

/**
 * Get execution summary
 * GET /api/v1/execution/:campaignId/summary
 */
export async function getExecutionSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const { data, error } = await supabase.rpc('get_execution_summary', {
      p_campaign_id: campaignId,
      p_organization_id: organizationId,
    });

    if (error) {
      throw new Error(`Failed to get summary: ${error.message}`);
    }

    const summary: ExecutionSummary = {
      campaignId: data.campaign_id,
      totalTasks: data.total_tasks,
      pending: data.pending,
      running: data.running,
      completed: data.completed,
      failed: data.failed,
      blocked: data.blocked,
      skipped: data.skipped,
      progress: parseFloat(data.progress),
      isComplete: data.is_complete,
      hasFailures: data.has_failures,
    };

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('getExecutionSummary error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get execution summary',
    });
  }
}

/**
 * Get execution logs
 * GET /api/v1/execution/:campaignId/logs
 */
export async function getExecutionLogs(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    // Get all task nodes
    const { data: tasks, error: tasksError } = await supabase
      .from('campaign_task_graph')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at');

    if (tasksError) {
      throw new Error(`Failed to get tasks: ${tasksError.message}`);
    }

    // Get all executions
    const { data: executions, error: executionsError } = await supabase
      .from('campaign_task_executions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at');

    if (executionsError) {
      throw new Error(`Failed to get executions: ${executionsError.message}`);
    }

    // Build logs by node
    const logsByNode = new Map<string, TaskExecutionLog>();

    tasks?.forEach((task) => {
      const nodeExecutions =
        executions?.filter((e) => e.node_id === task.node_id) || [];

      const totalDuration = nodeExecutions.reduce(
        (sum, e) => sum + (e.duration_ms || 0),
        0
      );

      const lastExecution = nodeExecutions[nodeExecutions.length - 1];

      logsByNode.set(task.node_id, {
        nodeId: task.node_id,
        taskType: task.task_type,
        status: task.status,
        attempts: nodeExecutions,
        totalAttempts: nodeExecutions.length,
        totalDurationMs: totalDuration,
        lastError: lastExecution?.error_message || task.error_message,
        output: task.output,
      });
    });

    // Get summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_execution_summary',
      {
        p_campaign_id: campaignId,
        p_organization_id: organizationId,
      }
    );

    if (summaryError) {
      throw new Error(`Failed to get summary: ${summaryError.message}`);
    }

    const summary: ExecutionSummary = {
      campaignId: summaryData.campaign_id,
      totalTasks: summaryData.total_tasks,
      pending: summaryData.pending,
      running: summaryData.running,
      completed: summaryData.completed,
      failed: summaryData.failed,
      blocked: summaryData.blocked,
      skipped: summaryData.skipped,
      progress: parseFloat(summaryData.progress),
      isComplete: summaryData.is_complete,
      hasFailures: summaryData.has_failures,
    };

    res.json({
      success: true,
      campaignId,
      logs: Array.from(logsByNode.values()),
      summary,
    });
  } catch (error: any) {
    console.error('getExecutionLogs error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get execution logs',
    });
  }
}

/**
 * Stop execution
 * POST /api/v1/execution/:campaignId/stop
 */
export async function stopExecution(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { campaignId } = req.params;

    const runner = activeRunners.get(campaignId);
    if (!runner) {
      return res.status(404).json({ error: 'No active execution found' });
    }

    await runner.stop();
    activeRunners.delete(campaignId);

    res.json({
      success: true,
      message: 'Execution stopped',
    });
  } catch (error: any) {
    console.error('stopExecution error:', error);
    res.status(500).json({
      error: error.message || 'Failed to stop execution',
    });
  }
}
