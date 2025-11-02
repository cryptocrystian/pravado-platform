import { Router } from 'express';
import { agentCollabController } from '../controllers/agent-collab.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All agent collaboration routes require authentication
router.use(authenticate);

// =====================================================
// COLLABORATION ROUTES
// =====================================================

router.post('/goals/:goalId/join', agentCollabController.joinGoal);
router.delete('/goals/:goalId/agents/:agentId', agentCollabController.leaveGoal);
router.patch('/collaborations/:id', agentCollabController.updateCollaboration);
router.get('/goals/:goalId/collaborators', agentCollabController.getGoalCollaborators);
router.get('/goals/:goalId/summary', agentCollabController.getCollaborationSummary);

// =====================================================
// HANDOFF ROUTES
// =====================================================

router.post('/handoffs', agentCollabController.initiateHandoff);
router.post('/handoffs/:handoffId/approve', agentCollabController.approveHandoff);
router.post('/handoffs/:handoffId/reject', agentCollabController.rejectHandoff);
router.get('/tasks/:taskId/handoffs', agentCollabController.getTaskHandoffs);
router.get('/agents/:agentId/pending-handoffs', agentCollabController.getPendingHandoffs);

// =====================================================
// MESSAGING ROUTES
// =====================================================

router.post('/threads', agentCollabController.createThread);
router.get('/goals/:goalId/threads', agentCollabController.getGoalThreads);
router.post('/messages', agentCollabController.sendMessage);
router.get('/threads/:threadId/messages', agentCollabController.getThreadMessages);
router.post('/escalate', agentCollabController.escalate);

export default router;
