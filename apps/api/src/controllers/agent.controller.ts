import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { agentService } from '../services/agent.service';

class AgentController {
  async getTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tasks = await agentService.getTasks(req.user!.organizationId, req.query);
      res.json({
        success: true,
        data: tasks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await agentService.getTaskById(req.params.id);
      res.json({
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await agentService.createTask({
        ...req.body,
        userId: req.user!.sub,
        organizationId: req.user!.organizationId,
      });
      res.status(201).json({
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await agentService.cancelTask(req.params.id);
      res.json({
        success: true,
        data: task,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const agentController = new AgentController();
