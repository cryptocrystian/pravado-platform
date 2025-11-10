// =====================================================
// STEP HANDLERS - ORCHESTRATOR
// Core Infrastructure Days 3-6
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { PlaybookStep, PlaybookStepType } from '@pravado/types';
import { handleAgentExecution } from './agentExecutionHandler';
import { handleDataTransform } from './dataTransformHandler';
import { handleConditionalBranch } from './conditionalBranchHandler';
import { handleApiCall } from './apiCallHandler';
import { handleMemorySearch } from './memorySearchHandler';
import { handlePromptTemplate } from './promptTemplateHandler';
import { handleCustomFunction } from './customFunctionHandler';

/**
 * Context provided to step handlers
 */
export interface StepExecutionContext {
  executionId: string;
  playbookId: string;
  organizationId: string;
  executionData: Record<string, any>;
}

/**
 * Step handler function signature
 */
export type StepHandler = (
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
) => Promise<Record<string, any>>;

/**
 * Execute a step based on its type
 */
export async function executeStep(
  step: PlaybookStep,
  input: Record<string, any>,
  context: StepExecutionContext
): Promise<Record<string, any>> {
  console.log(`Executing step: ${step.stepName} (${step.stepType})`);

  try {
    let output: Record<string, any>;

    switch (step.stepType) {
      case PlaybookStepType.AGENT_EXECUTION:
        output = await handleAgentExecution(step, input, context);
        break;

      case PlaybookStepType.DATA_TRANSFORM:
        output = await handleDataTransform(step, input, context);
        break;

      case PlaybookStepType.CONDITIONAL_BRANCH:
        output = await handleConditionalBranch(step, input, context);
        break;

      case PlaybookStepType.API_CALL:
        output = await handleApiCall(step, input, context);
        break;

      case PlaybookStepType.MEMORY_SEARCH:
        output = await handleMemorySearch(step, input, context);
        break;

      case PlaybookStepType.PROMPT_TEMPLATE:
        output = await handlePromptTemplate(step, input, context);
        break;

      case PlaybookStepType.CUSTOM_FUNCTION:
        output = await handleCustomFunction(step, input, context);
        break;

      case PlaybookStepType.PARALLEL_EXECUTION:
        // Parallel execution would require special handling
        throw new Error('PARALLEL_EXECUTION not yet implemented');

      case PlaybookStepType.WAIT_FOR_INPUT:
        // Wait for input would require special handling
        throw new Error('WAIT_FOR_INPUT not yet implemented');

      case PlaybookStepType.DATABASE_QUERY:
        // Database query would require special handling
        throw new Error('DATABASE_QUERY not yet implemented');

      default:
        throw new Error(`Unknown step type: ${step.stepType}`);
    }

    console.log(`Step ${step.stepName} completed successfully`);
    return output;
  } catch (error) {
    console.error(`Step ${step.stepName} failed:`, error);
    throw error;
  }
}
