// =====================================================
// PLAYBOOK EXECUTION ENGINE
// Core Infrastructure: AI Playbook Runtime
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import {
  PlaybookExecution,
  PlaybookStep,
  PlaybookStepResult,
  PlaybookExecutionStatus,
  StepResultStatus,
  PlaybookWithSteps,
  DEFAULT_RETRY_CONFIG,
} from '@pravado/types';
import {
  getPlaybookWithSteps,
  updatePlaybookExecution,
  createStepResult,
  updateStepResult,
} from './playbookService';
import { executeStep, StepExecutionContext } from './stepHandlers';

/**
 * Execution engine for running playbooks
 */
export class PlaybookExecutionEngine {
  private executionId: string;
  private organizationId: string;
  private playbook: PlaybookWithSteps | null = null;
  private execution: PlaybookExecution | null = null;
  private stepResults: Map<string, PlaybookStepResult> = new Map();
  private executionData: Map<string, any> = new Map();

  constructor(executionId: string, organizationId: string) {
    this.executionId = executionId;
    this.organizationId = organizationId;
  }

  /**
   * Start playbook execution
   */
  async start(execution: PlaybookExecution): Promise<void> {
    try {
      this.execution = execution;

      // Load playbook with steps
      this.playbook = await getPlaybookWithSteps(
        execution.playbookId,
        this.organizationId
      );

      if (!this.playbook) {
        throw new Error('Playbook not found');
      }

      if (this.playbook.steps.length === 0) {
        throw new Error('Playbook has no steps');
      }

      // Update execution to RUNNING
      this.execution = await updatePlaybookExecution(
        this.executionId,
        this.organizationId,
        {
          status: PlaybookExecutionStatus.RUNNING,
          startedAt: new Date().toISOString(),
        }
      );

      // Initialize execution data with input
      this.executionData.set('input', execution.inputData);

      // Start executing from first step
      const firstStep = this.playbook.steps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
      await this.executeStepWithRetry(firstStep);

      // Mark execution as completed if we got here
      await this.completeExecution();
    } catch (error) {
      await this.failExecution(error as Error);
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStepWithRetry(
    step: PlaybookStep,
    attemptNumber: number = 1
  ): Promise<void> {
    if (!this.execution || !this.playbook) {
      throw new Error('Execution not initialized');
    }

    try {
      // Check if execution should be paused or cancelled
      await this.checkExecutionStatus();

      // Evaluate step condition
      if (step.condition && !this.evaluateCondition(step.condition)) {
        console.log(`Step ${step.stepName} condition not met, skipping`);
        await this.skipStep(step);
        return;
      }

      // Prepare step input data
      const stepInput = this.prepareStepInput(step);

      // Create step result
      const stepResult = await createStepResult(
        this.executionId,
        step.id,
        stepInput,
        attemptNumber
      );

      this.stepResults.set(step.id, stepResult);

      // Update execution current step
      await updatePlaybookExecution(this.executionId, this.organizationId, {
        currentStepId: step.id,
      });

      // Update step result to RUNNING
      const runningResult = await updateStepResult(stepResult.id, {
        status: StepResultStatus.RUNNING,
        startedAt: new Date().toISOString(),
      });

      this.stepResults.set(step.id, runningResult);

      // Execute step with timeout
      const stepOutput = await this.executeStepWithTimeout(step, stepInput);

      // Update step result to COMPLETED
      const completedResult = await updateStepResult(stepResult.id, {
        status: StepResultStatus.COMPLETED,
        outputData: stepOutput,
        completedAt: new Date().toISOString(),
      });

      this.stepResults.set(step.id, completedResult);

      // Store step output in execution data
      this.executionData.set(`step_${step.stepOrder}_output`, stepOutput);

      // Update execution progress
      const completedSteps = (this.execution.completedSteps || 0) + 1;
      this.execution = await updatePlaybookExecution(
        this.executionId,
        this.organizationId,
        {
          completedSteps,
        }
      );

      // Determine next step
      const nextStep = this.getNextStep(step, true);
      if (nextStep) {
        await this.executeStepWithRetry(nextStep);
      }
    } catch (error) {
      await this.handleStepFailure(step, error as Error, attemptNumber);
    }
  }

  /**
   * Execute step with timeout
   */
  private async executeStepWithTimeout(
    step: PlaybookStep,
    input: Record<string, any>
  ): Promise<Record<string, any>> {
    const timeoutMs = step.timeoutSeconds * 1000;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step execution timed out after ${step.timeoutSeconds} seconds`));
      }, timeoutMs);

      const context: StepExecutionContext = {
        executionId: this.executionId,
        playbookId: this.playbook!.id,
        organizationId: this.organizationId,
        executionData: Object.fromEntries(this.executionData),
      };

      executeStep(step, input, context)
        .then((output) => {
          clearTimeout(timeoutId);
          resolve(output);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle step failure with retry logic
   */
  private async handleStepFailure(
    step: PlaybookStep,
    error: Error,
    attemptNumber: number
  ): Promise<void> {
    console.error(`Step ${step.stepName} failed (attempt ${attemptNumber}):`, error);

    const stepResult = this.stepResults.get(step.id);
    if (stepResult) {
      await updateStepResult(stepResult.id, {
        status: StepResultStatus.FAILED,
        errorMessage: error.message,
        errorStack: error.stack,
        completedAt: new Date().toISOString(),
      });
    }

    // Check if we should retry
    if (attemptNumber < step.maxRetries) {
      console.log(`Retrying step ${step.stepName} (attempt ${attemptNumber + 1}/${step.maxRetries})`);

      // Calculate retry delay with exponential backoff
      const delaySeconds =
        DEFAULT_RETRY_CONFIG.RETRY_DELAY_SECONDS *
        Math.pow(DEFAULT_RETRY_CONFIG.BACKOFF_MULTIPLIER, attemptNumber - 1);

      await this.sleep(delaySeconds * 1000);
      await this.executeStepWithRetry(step, attemptNumber + 1);
    } else {
      // Max retries exceeded
      if (step.isOptional) {
        console.log(`Optional step ${step.stepName} failed, continuing execution`);
        await this.skipStep(step);

        // Continue with next step
        const nextStep = this.getNextStep(step, false);
        if (nextStep) {
          await this.executeStepWithRetry(nextStep);
        }
      } else {
        // Required step failed, use failure branch or fail execution
        const nextStep = this.getNextStep(step, false);
        if (nextStep) {
          await this.executeStepWithRetry(nextStep);
        } else {
          throw error; // No failure branch, fail execution
        }
      }
    }
  }

  /**
   * Skip a step
   */
  private async skipStep(step: PlaybookStep): Promise<void> {
    const stepResult = this.stepResults.get(step.id);
    if (stepResult) {
      await updateStepResult(stepResult.id, {
        status: StepResultStatus.SKIPPED,
        completedAt: new Date().toISOString(),
      });
    }

    // Update execution progress
    const completedSteps = (this.execution!.completedSteps || 0) + 1;
    this.execution = await updatePlaybookExecution(this.executionId, this.organizationId, {
      completedSteps,
    });
  }

  /**
   * Get next step based on branching logic
   */
  private getNextStep(currentStep: PlaybookStep, success: boolean): PlaybookStep | null {
    if (!this.playbook) return null;

    // Check for explicit branching
    const nextStepId = success
      ? currentStep.onSuccessStepId
      : currentStep.onFailureStepId;

    if (nextStepId) {
      return this.playbook.steps.find((s) => s.id === nextStepId) || null;
    }

    // Default to next step in order (only on success)
    if (success) {
      const sortedSteps = this.playbook.steps.sort((a, b) => a.stepOrder - b.stepOrder);
      const currentIndex = sortedSteps.findIndex((s) => s.id === currentStep.id);
      if (currentIndex >= 0 && currentIndex < sortedSteps.length - 1) {
        return sortedSteps[currentIndex + 1];
      }
    }

    return null;
  }

  /**
   * Prepare step input from input mapping
   */
  private prepareStepInput(step: PlaybookStep): Record<string, any> {
    const input: Record<string, any> = {};

    if (!step.inputMapping || Object.keys(step.inputMapping).length === 0) {
      return input;
    }

    for (const [targetKey, sourceExpression] of Object.entries(step.inputMapping)) {
      input[targetKey] = this.resolveExpression(sourceExpression as string);
    }

    return input;
  }

  /**
   * Resolve expression from execution data
   * Supports: $input.field, $step_1_output.field, $step_2_output.field, etc.
   */
  private resolveExpression(expression: string): any {
    if (typeof expression !== 'string') {
      return expression;
    }

    // Simple expression resolution
    if (expression.startsWith('$')) {
      const parts = expression.substring(1).split('.');
      const dataKey = parts[0];
      const data = this.executionData.get(dataKey);

      if (!data) {
        return undefined;
      }

      // Navigate nested properties
      let value = data;
      for (let i = 1; i < parts.length; i++) {
        if (value && typeof value === 'object') {
          value = value[parts[i]];
        } else {
          return undefined;
        }
      }

      return value;
    }

    return expression;
  }

  /**
   * Evaluate step condition
   */
  private evaluateCondition(condition: Record<string, any>): boolean {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    if (condition.type === 'simple') {
      const { field, operator, value } = condition;
      const actualValue = this.resolveExpression(field);

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'notEquals':
          return actualValue !== value;
        case 'greaterThan':
          return actualValue > value;
        case 'lessThan':
          return actualValue < value;
        case 'contains':
          return String(actualValue).includes(value);
        default:
          return true;
      }
    }

    return true; // Default to true if condition format is unknown
  }

  /**
   * Check execution status (for pause/cancel)
   */
  private async checkExecutionStatus(): Promise<void> {
    // Refresh execution status from database
    const { data, error } = await (await import('../config/supabase')).supabase
      .from('playbook_executions')
      .select('status')
      .eq('id', this.executionId)
      .single();

    if (error) {
      throw new Error(`Failed to check execution status: ${error.message}`);
    }

    if (data.status === 'CANCELLED') {
      throw new Error('Execution was cancelled');
    }

    if (data.status === 'PAUSED') {
      // Wait for resume
      await this.waitForResume();
    }
  }

  /**
   * Wait for execution to resume
   */
  private async waitForResume(): Promise<void> {
    console.log('Execution paused, waiting for resume...');
    // In production, this would use a proper event system or polling
    // For now, just wait a bit and check again
    await this.sleep(5000);
    await this.checkExecutionStatus();
  }

  /**
   * Complete execution successfully
   */
  private async completeExecution(): Promise<void> {
    if (!this.execution) return;

    // Collect final output
    const outputData = this.collectOutputData();

    await updatePlaybookExecution(this.executionId, this.organizationId, {
      status: PlaybookExecutionStatus.COMPLETED,
      outputData,
      completedAt: new Date().toISOString(),
    });

    console.log(`Playbook execution ${this.executionId} completed successfully`);
  }

  /**
   * Fail execution
   */
  private async failExecution(error: Error): Promise<void> {
    if (!this.execution) return;

    await updatePlaybookExecution(this.executionId, this.organizationId, {
      status: PlaybookExecutionStatus.FAILED,
      errorMessage: error.message,
      errorStack: error.stack,
      completedAt: new Date().toISOString(),
    });

    console.error(`Playbook execution ${this.executionId} failed:`, error);
  }

  /**
   * Collect output data from execution
   */
  private collectOutputData(): Record<string, any> {
    if (!this.playbook) return {};

    const output: Record<string, any> = {};

    // Collect outputs from all completed steps
    for (const [key, value] of this.executionData.entries()) {
      if (key.startsWith('step_') && key.endsWith('_output')) {
        output[key] = value;
      }
    }

    return output;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Execute a playbook (entry point)
 */
export async function executePlaybook(
  execution: PlaybookExecution,
  organizationId: string
): Promise<void> {
  const engine = new PlaybookExecutionEngine(execution.id, organizationId);
  await engine.start(execution);
}
