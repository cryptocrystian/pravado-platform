// =====================================================
// AGENT PLANNING CONTROLLER
// =====================================================
// HTTP request handlers for autonomous agent planning

import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { plannerEngine, goalMonitor, taskResolver } from '../../../agents/src/planning';
import { logger } from '../lib/logger';
import {
  CreateAgentGoalInputSchema,
  UpdateAgentGoalInputSchema,
  CreateAgentTaskInputSchema,
  UpdateAgentTaskInputSchema,
  PlanningRequestSchema,
} from '@pravado/shared-types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class AgentPlanningController {
  // =====================================================
  // GOALS
  // =====================================================

  async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = CreateAgentGoalInputSchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
      });

      const { data, error } = await supabase
        .from('agent_goals')
        .insert([input])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create goal: ${error.message}`);
      }

      res.status(201).json(data);
    } catch (error) {
      logger.error('Failed to create goal', error);
      next(error);
    }
  }

  async listGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let query = supabase
        .from('agent_goals')
        .select('*')
        .eq('organization_id', organizationId);

      if (req.query.status) {
        query = query.eq('status', req.query.status);
      }

      if (req.query.agentId) {
        query = query.eq('agent_id', req.query.agentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list goals: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to list goals', error);
      next(error);
    }
  }

  async getGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const goal = await goalMonitor.getGoal(id, organizationId);

      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(goal);
    } catch (error) {
      logger.error('Failed to get goal', error);
      next(error);
    }
  }

  async updateGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const input = UpdateAgentGoalInputSchema.parse(req.body);

      const { data, error } = await supabase
        .from('agent_goals')
        .update(input)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update goal: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to update goal', error);
      next(error);
    }
  }

  async getGoalSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await goalMonitor.getGoalSummary(id, organizationId);

      if (!summary) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(summary);
    } catch (error) {
      logger.error('Failed to get goal summary', error);
      next(error);
    }
  }

  // =====================================================
  // TASKS
  // =====================================================

  async listGoalTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('goal_id', goalId)
        .eq('organization_id', organizationId)
        .order('step_number', { ascending: true });

      if (error) {
        throw new Error(`Failed to list tasks: ${error.message}`);
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to list goal tasks', error);
      next(error);
    }
  }

  async executeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // This would queue the task for execution
      // For now, just return success
      res.json({ message: 'Task execution queued', taskId });
    } catch (error) {
      logger.error('Failed to execute task', error);
      next(error);
    }
  }

  // =====================================================
  // EXECUTION
  // =====================================================

  async executeGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if goal requires approval
      const requiresApproval = await goalMonitor.requiresApproval(id);

      if (requiresApproval) {
        return res.status(403).json({
          error: 'Goal requires approval before execution',
          requiresApproval: true,
        });
      }

      // Queue goal for execution
      res.json({ message: 'Goal execution started', goalId: id });
    } catch (error) {
      logger.error('Failed to execute goal', error);
      next(error);
    }
  }

  async approveGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await goalMonitor.approveGoal(id, userId);

      res.json({ message: 'Goal approved', goalId: id });
    } catch (error) {
      logger.error('Failed to approve goal', error);
      next(error);
    }
  }

  async getExecutionGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const { goalId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('agent_execution_graphs')
        .select('*')
        .eq('goal_id', goalId)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Execution graph not found' });
      }

      res.json(data);
    } catch (error) {
      logger.error('Failed to get execution graph', error);
      next(error);
    }
  }
}

export const agentPlanningController = new AgentPlanningController();
