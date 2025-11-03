// =====================================================
// MULTI-AGENT DIALOGUE API ROUTES
// Sprint 50 Phase 4.6
// =====================================================

import express, { Request, Response } from 'express';
import { multiAgentDialogueManager } from '../services/multiAgentDialogueManager';
import type {
  InitializeDialogueInput,
  TakeTurnInput,
  InterruptDialogueInput,
  ResolveInterruptionInput,
} from '@pravado/shared-types';

const router = express.Router();

/**
 * POST /api/multi-agent-dialogue/init
 * Initialize a multi-agent dialogue session
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    const input: InitializeDialogueInput = req.body;

    if (!input.agentIds || input.agentIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentIds array is required and must not be empty',
      });
    }

    if (!input.context || !input.context.topic) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'context.topic is required',
      });
    }

    const session = await multiAgentDialogueManager.initializeDialogue(input);

    res.status(201).json({ success: true, session });
  } catch (error: any) {
    console.error('Error initializing dialogue:', error);
    res.status(500).json({
      error: 'Failed to initialize dialogue',
      message: error.message,
    });
  }
});

/**
 * POST /api/multi-agent-dialogue/turn
 * Take a turn in the dialogue
 */
router.post('/turn', async (req: Request, res: Response) => {
  try {
    const input: TakeTurnInput = req.body;

    if (!input.agentId || !input.sessionId || !input.input) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId, sessionId, and input are required',
      });
    }

    const result = await multiAgentDialogueManager.takeTurn(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('Error taking turn:', error);
    res.status(500).json({
      error: 'Failed to take turn',
      message: error.message,
    });
  }
});

/**
 * GET /api/multi-agent-dialogue/transcript/:sessionId
 * Get dialogue transcript with metadata
 */
router.get('/transcript/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const transcript = await multiAgentDialogueManager.getDialogueTranscript(sessionId);

    res.status(200).json({ success: true, transcript });
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      error: 'Failed to fetch transcript',
      message: error.message,
    });
  }
});

/**
 * POST /api/multi-agent-dialogue/interrupt
 * Interrupt a dialogue
 */
router.post('/interrupt', async (req: Request, res: Response) => {
  try {
    const input: InterruptDialogueInput = req.body;

    if (!input.sessionId || !input.reason || !input.details) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'sessionId, reason, and details are required',
      });
    }

    const interruption = await multiAgentDialogueManager.interruptDialogue(input);

    res.status(200).json({ success: true, interruption });
  } catch (error: any) {
    console.error('Error interrupting dialogue:', error);
    res.status(500).json({
      error: 'Failed to interrupt dialogue',
      message: error.message,
    });
  }
});

/**
 * POST /api/multi-agent-dialogue/resolve-interruption
 * Resolve an interruption
 */
router.post('/resolve-interruption', async (req: Request, res: Response) => {
  try {
    const input: ResolveInterruptionInput = req.body;

    if (!input.interruptionId || !input.action) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'interruptionId and action are required',
      });
    }

    const interruption = await multiAgentDialogueManager.resolveInterruption(input);

    res.status(200).json({ success: true, interruption });
  } catch (error: any) {
    console.error('Error resolving interruption:', error);
    res.status(500).json({
      error: 'Failed to resolve interruption',
      message: error.message,
    });
  }
});

/**
 * GET /api/multi-agent-dialogue/analytics/:sessionId
 * Get dialogue analytics
 */
router.get('/analytics/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const analytics = await multiAgentDialogueManager.getDialogueAnalytics(sessionId);

    res.status(200).json({ success: true, analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/multi-agent-dialogue/next-speaker/:sessionId
 * Get next speaker for a session
 */
router.get('/next-speaker/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { currentSpeaker, strategy } = req.query;

    if (!currentSpeaker || !strategy) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'currentSpeaker and strategy query parameters are required',
      });
    }

    const nextSpeaker = await multiAgentDialogueManager.getNextSpeaker(
      sessionId,
      strategy as any,
      currentSpeaker as string
    );

    res.status(200).json({ success: true, nextSpeaker });
  } catch (error: any) {
    console.error('Error getting next speaker:', error);
    res.status(500).json({
      error: 'Failed to get next speaker',
      message: error.message,
    });
  }
});

/**
 * GET /api/multi-agent-dialogue/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'multi-agent-dialogue',
  });
});

export default router;
