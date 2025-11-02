import { AgentType } from '@pravado/shared-types';
import type { AgentJobData } from '../types';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

export async function processAgentTask(data: AgentJobData) {
  const { taskId, type } = data;

  try {
    await updateTaskStatus(taskId, 'RUNNING', new Date());

    let output;

    switch (type) {
      case AgentType.CONTENT_GENERATOR:
        output = await processContentGeneration(data);
        break;
      case AgentType.SEO_OPTIMIZER:
        output = await processSEOOptimization(data);
        break;
      case AgentType.OUTREACH_COMPOSER:
        output = await processOutreachComposition(data);
        break;
      case AgentType.KEYWORD_RESEARCHER:
        output = await processKeywordResearch(data);
        break;
      case AgentType.STRATEGY_PLANNER:
        output = await processStrategyPlanning(data);
        break;
      case AgentType.COMPETITOR_ANALYZER:
        output = await processCompetitorAnalysis(data);
        break;
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }

    await updateTaskStatus(taskId, 'COMPLETED', null, new Date(), output);
  } catch (error) {
    logger.error(`Error processing agent task ${taskId}:`, error);

    await updateTaskStatus(
      taskId,
      'FAILED',
      null,
      new Date(),
      null,
      {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {},
        retryable: true,
        retryCount: 0,
      }
    );

    throw error;
  }
}

async function updateTaskStatus(
  taskId: string,
  status: string,
  startedAt: Date | null = null,
  completedAt: Date | null = null,
  output: unknown = null,
  error: unknown = null
) {
  const updateData: Record<string, unknown> = { status };

  if (startedAt) updateData.started_at = startedAt.toISOString();
  if (completedAt) updateData.completed_at = completedAt.toISOString();
  if (output) updateData.output = output;
  if (error) updateData.error = error;

  await supabase.from('agent_tasks').update(updateData).eq('id', taskId);
}

async function processContentGeneration(data: AgentJobData) {
  logger.info(`Content generation for task ${data.taskId}`);
  return {
    result: 'Content generation placeholder',
    confidence: 0.95,
    tokensUsed: 500,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed context', 'Generated content'],
      alternatives: [],
      suggestedNextSteps: ['Review content', 'Publish'],
      warnings: [],
    },
  };
}

async function processSEOOptimization(data: AgentJobData) {
  logger.info(`SEO optimization for task ${data.taskId}`);
  return {
    result: 'SEO optimization placeholder',
    confidence: 0.9,
    tokensUsed: 300,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed keywords', 'Optimized meta tags'],
      alternatives: [],
      suggestedNextSteps: ['Update content'],
      warnings: [],
    },
  };
}

async function processOutreachComposition(data: AgentJobData) {
  logger.info(`Outreach composition for task ${data.taskId}`);
  return {
    result: 'Outreach email placeholder',
    confidence: 0.88,
    tokensUsed: 400,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed recipient profile', 'Crafted personalized message'],
      alternatives: [],
      suggestedNextSteps: ['Review and send'],
      warnings: [],
    },
  };
}

async function processKeywordResearch(data: AgentJobData) {
  logger.info(`Keyword research for task ${data.taskId}`);
  return {
    result: 'Keyword research placeholder',
    confidence: 0.92,
    tokensUsed: 350,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed search trends', 'Identified opportunities'],
      alternatives: [],
      suggestedNextSteps: ['Create content strategy'],
      warnings: [],
    },
  };
}

async function processStrategyPlanning(data: AgentJobData) {
  logger.info(`Strategy planning for task ${data.taskId}`);
  return {
    result: 'Strategy plan placeholder',
    confidence: 0.85,
    tokensUsed: 600,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed objectives', 'Developed tactics'],
      alternatives: [],
      suggestedNextSteps: ['Review and approve'],
      warnings: [],
    },
  };
}

async function processCompetitorAnalysis(data: AgentJobData) {
  logger.info(`Competitor analysis for task ${data.taskId}`);
  return {
    result: 'Competitor analysis placeholder',
    confidence: 0.87,
    tokensUsed: 450,
    model: 'gpt-4',
    metadata: {
      reasoning: ['Analyzed competitor strategies', 'Identified gaps'],
      alternatives: [],
      suggestedNextSteps: ['Develop counter-strategy'],
      warnings: [],
    },
  };
}
