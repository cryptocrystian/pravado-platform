// =====================================================
// PERFORMANCE CONTROLLER
// =====================================================

import { Request, Response } from 'express';
import { insightEngine, abTestEngine, qaMetrics } from '@pravado/agents';
import type {
  CreatePerformanceInsightInput,
  CreateABExperimentInput,
  CreateExperimentVariantInput,
  CreatePerformanceFeedbackInput,
  ABTestAssignmentRequest,
  RecordExperimentOutcomeInput,
} from '@pravado/types';

// =====================================================
// PERFORMANCE INSIGHTS
// =====================================================

/**
 * Create a performance insight
 */
export async function createInsight(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: CreatePerformanceInsightInput = {
      ...req.body,
      organizationId,
    };

    const insight = await insightEngine.generateInsight(input);

    res.status(201).json(insight);
  } catch (error: any) {
    console.error('[PerformanceController] Error creating insight:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get insights for an agent
 */
export async function getInsightsForAgent(req: Request, res: Response) {
  try {
    const { agentId } = req.params;
    const organizationId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insights = await insightEngine.getInsightsForAgent(
      agentId,
      organizationId,
      limit
    );

    res.json(insights);
  } catch (error: any) {
    console.error('[PerformanceController] Error fetching insights:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get insight summary for dashboard
 */
export async function getInsightSummary(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const summary = await insightEngine.getInsightSummary(organizationId, days);

    res.json(summary);
  } catch (error: any) {
    console.error('[PerformanceController] Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Compare agent to benchmark
 */
export async function compareToBenchmark(req: Request, res: Response) {
  try {
    const { agentType } = req.params;
    const organizationId = req.user?.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const comparison = await insightEngine.compareToBenchmark(
      agentType,
      organizationId,
      days
    );

    if (!comparison) {
      return res.status(404).json({ error: 'No benchmark found for this agent type' });
    }

    res.json(comparison);
  } catch (error: any) {
    console.error('[PerformanceController] Error comparing to benchmark:', error);
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// A/B EXPERIMENTS
// =====================================================

/**
 * Create an A/B experiment
 */
export async function createExperiment(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: CreateABExperimentInput = {
      ...req.body,
      organizationId,
    };

    const experiment = await abTestEngine.createExperiment(input);

    res.status(201).json(experiment);
  } catch (error: any) {
    console.error('[PerformanceController] Error creating experiment:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Create an experiment variant
 */
export async function createVariant(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: CreateExperimentVariantInput = {
      ...req.body,
      organizationId,
    };

    const variant = await abTestEngine.createVariant(input);

    res.status(201).json(variant);
  } catch (error: any) {
    console.error('[PerformanceController] Error creating variant:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Start an experiment
 */
export async function startExperiment(req: Request, res: Response) {
  try {
    const { experimentId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experiment = await abTestEngine.startExperiment(experimentId, organizationId);

    res.json(experiment);
  } catch (error: any) {
    console.error('[PerformanceController] Error starting experiment:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Assign variant to entity
 */
export async function assignVariant(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: ABTestAssignmentRequest = {
      ...req.body,
      organizationId,
    };

    const result = await abTestEngine.assignVariant(request);

    res.json(result);
  } catch (error: any) {
    console.error('[PerformanceController] Error assigning variant:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Record experiment outcome
 */
export async function recordOutcome(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input: RecordExperimentOutcomeInput = req.body;

    await abTestEngine.recordOutcome(
      input.assignmentId,
      input.successScore,
      input.qualityScore,
      input.efficiencyScore,
      input.executionTimeMs,
      organizationId
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('[PerformanceController] Error recording outcome:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Complete an experiment
 */
export async function completeExperiment(req: Request, res: Response) {
  try {
    const { experimentId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await abTestEngine.completeExperiment(experimentId, organizationId);

    res.json(results);
  } catch (error: any) {
    console.error('[PerformanceController] Error completing experiment:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Get experiment results
 */
export async function getExperimentResults(req: Request, res: Response) {
  try {
    const { experimentId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await abTestEngine.getExperimentResults(experimentId, organizationId);

    res.json(results);
  } catch (error: any) {
    console.error('[PerformanceController] Error fetching experiment results:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * List experiments
 */
export async function listExperiments(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    const status = req.query.status as any;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experiments = await abTestEngine.listExperiments(organizationId, status);

    res.json(experiments);
  } catch (error: any) {
    console.error('[PerformanceController] Error listing experiments:', error);
    res.status(500).json({ error: error.message });
  }
}

// =====================================================
// QUALITY METRICS
// =====================================================

/**
 * Calculate quality metrics for content
 */
export async function calculateQualityMetrics(req: Request, res: Response) {
  try {
    const { content, contentType, context, includeAIAnalysis } = req.body;

    if (!content || !contentType) {
      return res.status(400).json({ error: 'Content and contentType are required' });
    }

    const metrics = await qaMetrics.calculateQualityMetrics({
      content,
      contentType,
      context,
      includeAIAnalysis,
    });

    res.json(metrics);
  } catch (error: any) {
    console.error('[PerformanceController] Error calculating quality metrics:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get quality trends
 */
export async function getQualityTrends(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agentId, agentType } = req.query;
    const days = parseInt(req.query.days as string) || 30;

    const trends = await qaMetrics.getQualityTrends({
      agentId: agentId as string,
      agentType: agentType as string,
      organizationId,
      days,
    });

    res.json(trends);
  } catch (error: any) {
    console.error('[PerformanceController] Error fetching quality trends:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Compare quality to benchmark
 */
export async function compareQualityToBenchmark(req: Request, res: Response) {
  try {
    const { agentType } = req.params;
    const organizationId = req.user?.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const comparison = await qaMetrics.compareQualityToBenchmark({
      agentType,
      organizationId,
      days,
    });

    if (!comparison) {
      return res.status(404).json({ error: 'No benchmark or data found' });
    }

    res.json(comparison);
  } catch (error: any) {
    console.error('[PerformanceController] Error comparing quality:', error);
    res.status(500).json({ error: error.message });
  }
}
