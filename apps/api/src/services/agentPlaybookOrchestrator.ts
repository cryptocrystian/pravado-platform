// =====================================================
// AGENT PLAYBOOK ORCHESTRATOR SERVICE
// Sprint 43 Phase 3.5.1
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import {
  AgentContext,
  PlaybookChainConfig,
  ExecutionResult,
  AgentPlaybookDecisionLog,
  PlaybookSelectionRequest,
  PlaybookSelectionResponse,
  TriggerPlaybookRequest,
  AgentPlaybookLogEntity,
  Playbook,
  PlaybookExecution,
} from '@pravado/types';
import { playbookService } from './playbookService';
import { playbookExecutionEngine } from './playbookExecutionEngine';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Agent Playbook Orchestrator
 * Enables agents to autonomously select, launch, and chain playbooks
 */
class AgentPlaybookOrchestrator {
  /**
   * Select the most relevant playbook for a given agent context
   * Uses GPT-4 to intelligently match playbooks to agent intent
   */
  async selectRelevantPlaybook(
    request: PlaybookSelectionRequest
  ): Promise<PlaybookSelectionResponse> {
    const { context, availablePlaybooks, minConfidence = 0.6, logDecision = true } = request;

    // Fetch available playbooks if not provided
    const playbooks = availablePlaybooks || await this.getAvailablePlaybooks(context.organizationId);

    if (playbooks.length === 0) {
      return {
        playbook: null,
        reasoning: 'No playbooks available for this organization',
        confidence: 0,
        alternatives: [],
      };
    }

    // Build playbook descriptions for LLM
    const playbookDescriptions = playbooks.map((pb, index) => ({
      index,
      id: pb.id,
      name: pb.name,
      description: pb.description || 'No description',
      category: pb.category || 'general',
      tags: pb.tags || [],
    }));

    // Construct GPT-4 prompt
    const systemPrompt = this.buildSelectionSystemPrompt();
    const userPrompt = this.buildSelectionUserPrompt(context, playbookDescriptions);

    try {
      // Call GPT-4 for playbook selection
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more deterministic selection
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from GPT-4');
      }

      const selectionResult = JSON.parse(responseContent);

      // Extract selection details
      const selectedPlaybookId = selectionResult.selectedPlaybookId;
      const reasoning = selectionResult.reasoning;
      const confidence = selectionResult.confidence;
      const alternatives = selectionResult.alternatives || [];

      // Find the selected playbook
      const selectedPlaybook = selectedPlaybookId
        ? playbooks.find(pb => pb.id === selectedPlaybookId) || null
        : null;

      // Check confidence threshold
      if (confidence < minConfidence) {
        if (logDecision) {
          await this.logAgentPlaybookDecision({
            agentId: context.agentId,
            organizationId: context.organizationId,
            userPrompt: context.userPrompt,
            agentContext: context,
            reasoning: `${reasoning} (Confidence below threshold: ${confidence} < ${minConfidence})`,
            selectedPlaybookId: null,
            selectedPlaybookName: null,
            alternativesConsidered: alternatives,
            confidenceScore: confidence,
            playbookFound: false,
            executionId: null,
          });
        }

        return {
          playbook: null,
          reasoning: `${reasoning} (Confidence ${confidence} below threshold ${minConfidence})`,
          confidence,
          alternatives,
        };
      }

      // Log the decision
      let decisionLogId: string | undefined;
      if (logDecision && selectedPlaybook) {
        decisionLogId = await this.logAgentPlaybookDecision({
          agentId: context.agentId,
          organizationId: context.organizationId,
          userPrompt: context.userPrompt,
          agentContext: context,
          reasoning,
          selectedPlaybookId: selectedPlaybook.id,
          selectedPlaybookName: selectedPlaybook.name,
          alternativesConsidered: alternatives,
          confidenceScore: confidence,
          playbookFound: true,
          executionId: null,
        });
      }

      return {
        playbook: selectedPlaybook,
        reasoning,
        confidence,
        alternatives,
        decisionLogId,
      };
    } catch (error) {
      console.error('Error in playbook selection:', error);
      throw new Error(`Failed to select playbook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Chain multiple playbook executions in sequence
   * Maps outputs from one playbook to inputs of the next
   */
  async chainPlaybookExecutions(
    chainConfig: PlaybookChainConfig
  ): Promise<ExecutionResult> {
    const chainId = chainConfig.chainId || uuidv4();
    const startTime = new Date();
    const chainOutputs: Array<{
      playbookId: string;
      output: Record<string, any>;
      status: string;
    }> = [];
    const selectedPlaybooks: Array<{
      playbookId: string;
      playbookName: string;
      executionId: string;
    }> = [];

    let currentInput = chainConfig.initialInput || {};
    let lastExecutionId: string | null = null;

    try {
      // Execute each playbook in sequence
      for (const playbookConfig of chainConfig.playbooks) {
        const { playbookId, inputMapping, continueOnFailure = false, timeoutMs } = playbookConfig;

        // Fetch playbook details
        const playbook = await playbookService.getPlaybookById(playbookId);
        if (!playbook) {
          throw new Error(`Playbook not found: ${playbookId}`);
        }

        // Map input from previous execution
        const mappedInput = inputMapping
          ? this.mapPlaybookInput(currentInput, inputMapping)
          : currentInput;

        // Execute playbook
        const execution = await playbookExecutionEngine.executePlaybook(
          playbookId,
          mappedInput,
          timeoutMs
        );

        lastExecutionId = execution.id;

        selectedPlaybooks.push({
          playbookId: playbook.id,
          playbookName: playbook.name,
          executionId: execution.id,
        });

        // Wait for execution to complete
        const executionResult = await this.waitForExecution(execution.id, timeoutMs);

        chainOutputs.push({
          playbookId: playbook.id,
          output: executionResult.output || {},
          status: executionResult.status,
        });

        // Update current input for next playbook
        currentInput = executionResult.output || {};

        // Handle failures
        if (executionResult.status === 'failed' && !continueOnFailure) {
          const endTime = new Date();
          return {
            executionId: chainId,
            selectedPlaybooks,
            status: 'failure',
            output: currentInput,
            chainOutputs,
            errorMessage: `Chain stopped at playbook ${playbook.name}: ${executionResult.errorMessage || 'Execution failed'}`,
            startedAt: startTime,
            completedAt: endTime,
            durationMs: endTime.getTime() - startTime.getTime(),
          };
        }
      }

      // All playbooks completed successfully
      const endTime = new Date();
      return {
        executionId: chainId,
        selectedPlaybooks,
        status: 'success',
        output: currentInput,
        chainOutputs,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      return {
        executionId: chainId,
        selectedPlaybooks,
        status: 'failure',
        output: currentInput,
        chainOutputs,
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt: startTime,
        completedAt: endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Auto-select and trigger a playbook for an agent
   * Combines selection and execution in one operation
   */
  async triggerPlaybookForAgent(
    request: TriggerPlaybookRequest
  ): Promise<ExecutionResult> {
    const { agentId, userPrompt, additionalContext, playbookId, input, logDecision = true } = request;

    const startTime = new Date();

    try {
      let selectedPlaybook: Playbook | null = null;
      let decisionLogId: string | undefined;

      // If playbook ID is provided, skip selection
      if (playbookId) {
        selectedPlaybook = await playbookService.getPlaybookById(playbookId);
        if (!selectedPlaybook) {
          throw new Error(`Playbook not found: ${playbookId}`);
        }
      } else {
        // Auto-select playbook using GPT-4
        const context: AgentContext = {
          agentId,
          organizationId: additionalContext?.organizationId || '',
          userPrompt,
          ...additionalContext,
        };

        const selectionResponse = await this.selectRelevantPlaybook({
          context,
          logDecision,
        });

        selectedPlaybook = selectionResponse.playbook;
        decisionLogId = selectionResponse.decisionLogId;

        if (!selectedPlaybook) {
          const endTime = new Date();
          return {
            executionId: uuidv4(),
            selectedPlaybooks: [],
            status: 'failure',
            errorMessage: `No suitable playbook found. Reasoning: ${selectionResponse.reasoning}`,
            decisionLogId,
            startedAt: startTime,
            completedAt: endTime,
            durationMs: endTime.getTime() - startTime.getTime(),
          };
        }
      }

      // Execute the selected playbook
      const execution = await playbookExecutionEngine.executePlaybook(
        selectedPlaybook.id,
        input || { userPrompt }
      );

      // Update decision log with execution ID
      if (decisionLogId) {
        await this.updateDecisionLogExecution(decisionLogId, execution.id);
      }

      // Wait for execution to complete
      const executionResult = await this.waitForExecution(execution.id);

      const endTime = new Date();

      return {
        executionId: execution.id,
        selectedPlaybooks: [{
          playbookId: selectedPlaybook.id,
          playbookName: selectedPlaybook.name,
          executionId: execution.id,
        }],
        status: executionResult.status === 'completed' ? 'success' : 'failure',
        output: executionResult.output,
        errorMessage: executionResult.errorMessage,
        decisionLogId,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      return {
        executionId: uuidv4(),
        selectedPlaybooks: [],
        status: 'failure',
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt: startTime,
        completedAt: endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Log an agent's playbook selection decision to the database
   */
  async logAgentPlaybookDecision(
    decision: Omit<AgentPlaybookDecisionLog, 'id' | 'timestamp'>
  ): Promise<string> {
    const logId = uuidv4();

    const logEntity: Omit<AgentPlaybookLogEntity, 'created_at'> = {
      id: logId,
      agent_id: decision.agentId,
      organization_id: decision.organizationId,
      user_prompt: decision.userPrompt,
      agent_context: decision.agentContext as Record<string, any>,
      reasoning: decision.reasoning,
      selected_playbook_id: decision.selectedPlaybookId,
      selected_playbook_name: decision.selectedPlaybookName || null,
      alternatives_considered: decision.alternativesConsidered,
      confidence_score: decision.confidenceScore,
      playbook_found: decision.playbookFound,
      execution_id: decision.executionId,
      metadata: decision.metadata || null,
    };

    const { error } = await supabase
      .from('agent_playbook_logs')
      .insert(logEntity);

    if (error) {
      console.error('Error logging agent playbook decision:', error);
      throw new Error(`Failed to log decision: ${error.message}`);
    }

    return logId;
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Build system prompt for GPT-4 playbook selection
   */
  private buildSelectionSystemPrompt(): string {
    return `You are an AI agent trying to solve a task using available playbooks (workflows).

Your job is to:
1. Analyze the user's prompt and agent context
2. Review all available playbooks
3. Select the SINGLE most relevant playbook that best matches the task
4. Provide your reasoning and confidence score

Rules:
- Only select ONE playbook (the best match)
- If NO playbook is suitable, return null with explanation
- Consider the playbook's name, description, category, and tags
- Use agent memory and context to make informed decisions
- Confidence score should be 0.0 to 1.0

Response format (JSON):
{
  "selectedPlaybookId": "uuid or null",
  "reasoning": "explanation of why this playbook was selected or why none fit",
  "confidence": 0.85,
  "alternatives": [
    {
      "playbookId": "uuid",
      "playbookName": "name",
      "reason": "why this was considered but not selected",
      "score": 0.6
    }
  ]
}`;
  }

  /**
   * Build user prompt for GPT-4 playbook selection
   */
  private buildSelectionUserPrompt(
    context: AgentContext,
    playbooks: Array<{ index: number; id: string; name: string; description: string; category: string; tags: string[] }>
  ): string {
    const playbooksList = playbooks.map(pb =>
      `${pb.index + 1}. ID: ${pb.id}\n   Name: ${pb.name}\n   Description: ${pb.description}\n   Category: ${pb.category}\n   Tags: ${pb.tags.join(', ')}`
    ).join('\n\n');

    return `User Prompt: "${context.userPrompt}"

Agent Context:
- Agent ID: ${context.agentId}
- Current Goal: ${context.currentGoal || 'Not specified'}
${context.conversationHistory ? `- Recent Conversation: ${JSON.stringify(context.conversationHistory.slice(-3))}` : ''}
${context.relevantMemories ? `- Relevant Memories: ${JSON.stringify(context.relevantMemories.slice(0, 3))}` : ''}

Available Playbooks:
${playbooksList}

Select the best playbook for this task or explain why none are suitable.`;
  }

  /**
   * Get available playbooks for an organization
   */
  private async getAvailablePlaybooks(organizationId: string): Promise<Playbook[]> {
    return playbookService.listPlaybooks({
      organizationId,
      status: 'active',
    });
  }

  /**
   * Map inputs from one playbook to another using input mapping configuration
   */
  private mapPlaybookInput(
    previousOutput: Record<string, any>,
    inputMapping: Record<string, string>
  ): Record<string, any> {
    const mappedInput: Record<string, any> = {};

    for (const [targetField, sourceExpression] of Object.entries(inputMapping)) {
      // Simple expression evaluation
      // Supports: $previous_output.field, $input.field
      if (sourceExpression.startsWith('$previous_output.')) {
        const fieldPath = sourceExpression.replace('$previous_output.', '');
        mappedInput[targetField] = this.getNestedValue(previousOutput, fieldPath);
      } else if (sourceExpression.startsWith('$input.')) {
        const fieldPath = sourceExpression.replace('$input.', '');
        mappedInput[targetField] = this.getNestedValue(previousOutput, fieldPath);
      } else {
        // Literal value
        mappedInput[targetField] = sourceExpression;
      }
    }

    return mappedInput;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Wait for a playbook execution to complete
   */
  private async waitForExecution(
    executionId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<PlaybookExecution> {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < timeoutMs) {
      const execution = await playbookService.getPlaybookExecution(executionId);

      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      if (execution.status === 'completed' || execution.status === 'failed') {
        return execution;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Execution timeout after ${timeoutMs}ms`);
  }

  /**
   * Update decision log with execution ID
   */
  private async updateDecisionLogExecution(
    decisionLogId: string,
    executionId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_playbook_logs')
      .update({ execution_id: executionId })
      .eq('id', decisionLogId);

    if (error) {
      console.error('Error updating decision log:', error);
    }
  }
}

// Export singleton instance
export const agentPlaybookOrchestrator = new AgentPlaybookOrchestrator();
