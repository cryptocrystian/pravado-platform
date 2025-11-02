import { Router } from 'express';
import { agentPlanningController } from '../controllers/agent-planning.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All agent planning routes require authentication
router.use(authenticate);

// =====================================================
// GOAL ROUTES
// =====================================================

router.post('/goals', agentPlanningController.createGoal);
router.get('/goals', agentPlanningController.listGoals);
router.get('/goals/:id', agentPlanningController.getGoal);
router.patch('/goals/:id', agentPlanningController.updateGoal);
router.get('/goals/:id/summary', agentPlanningController.getGoalSummary);
router.post('/goals/:id/execute', agentPlanningController.executeGoal);
router.post('/goals/:id/approve', agentPlanningController.approveGoal);

// =====================================================
// TASK ROUTES
// =====================================================

router.get('/goals/:goalId/tasks', agentPlanningController.listGoalTasks);
router.post('/tasks/:taskId/execute', agentPlanningController.executeTask);

// =====================================================
// EXECUTION GRAPH ROUTES
// =====================================================

router.get('/execution-graphs/:goalId', agentPlanningController.getExecutionGraph);

export default router;
