import { Router } from 'express';
import { agentController } from '../controllers/agent.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Permission } from '@pravado/shared-types';

const router = Router();

router.use(authenticate);

router.get('/tasks', authorize(Permission.AGENT_EXECUTE), agentController.getTasks);
router.get('/tasks/:id', authorize(Permission.AGENT_EXECUTE), agentController.getTaskById);
router.post('/tasks', authorize(Permission.AGENT_EXECUTE), agentController.createTask);
router.post('/tasks/:id/cancel', authorize(Permission.AGENT_EXECUTE), agentController.cancelTask);

export default router;
