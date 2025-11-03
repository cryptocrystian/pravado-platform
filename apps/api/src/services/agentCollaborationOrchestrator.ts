// =====================================================
// AGENT COLLABORATION ORCHESTRATOR SERVICE
// Sprint 43 Phase 3.5.2
// =====================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import {
  EscalationRequest,
  EscalationResult,
  DelegationRequest,
  DelegationResult,
  CollaborationRequest,
  CollaborationResult,
  AgentProfile,
  AgentRoleHierarchy,
  AgentCollaborationLogEntity,
  FindAgentRequest,
  AgentMatch,
} from '@pravado/shared-types';
import { agentPlaybookOrchestrator } from './agentPlaybookOrchestrator';
import { playbookExecutionEngine } from './playbookExecutionEngine';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Role hierarchy configuration
const ROLE_HIERARCHY: AgentRoleHierarchy[] = [
  {
    role: 'assistant',
    level: 1,
    capabilities: ['basic_tasks', 'data_retrieval', 'simple_analysis'],
    canEscalateTo: ['specialist', 'analyst', 'strategist'],
  },
  {
    role: 'specialist',
    level: 2,
    capabilities: ['advanced_tasks', 'domain_expertise', 'complex_analysis'],
    canEscalateTo: ['strategist', 'manager'],
  },
  {
    role: 'analyst',
    level: 2,
    capabilities: ['data_analysis', 'reporting', 'insights_generation'],
    canEscalateTo: ['strategist', 'manager'],
  },
  {
    role: 'strategist',
    level: 3,
    capabilities: ['strategic_planning', 'decision_making', 'high_level_analysis'],
    canEscalateTo: ['manager', 'executive'],
  },
  {
    role: 'manager',
    level: 4,
    capabilities: ['team_coordination', 'resource_allocation', 'approval_authority'],
    canEscalateTo: ['executive'],
  },
  {
    role: 'executive',
    level: 5,
    capabilities: ['all_permissions', 'final_authority', 'policy_setting'],
    canEscalateTo: [],
  },
];

/**
 * Agent Collaboration Orchestrator
 * Enables agents to escalate, delegate, and coordinate on multi-agent workflows
 */
class AgentCollaborationOrchestrator {
  /**
   * Escalate a task to a higher-permission agent
   * Uses GPT-4 to intelligently select escalation target
   */
  async escalateTaskToAgent(
    escalationInput: EscalationRequest
  ): Promise<EscalationResult> {
    const {
      agentId,
      organizationId,
      taskContext,
      failureReason,
      confidenceScore,
      targetAgentId,
      requiredCapabilities,
      logEscalation = true,
    } = escalationInput;

    try {
      // Get initiating agent profile
      const initiatingAgent = await this.getAgentProfile(agentId, organizationId);
      if (!initiatingAgent) {
        return {
          success: false,
          escalationTarget: null,
          reasoning: 'Initiating agent not found',
          confidence: 0,
          alternativesConsidered: [],
          errorMessage: 'Agent not found',
        };
      }

      // Determine escalation target
      let targetAgent: AgentProfile | null = null;
      let reasoning = '';
      let confidence = 0;
      let alternatives: Array<{
        agentId: string;
        agentName?: string;
        role?: string;
        reason: string;
        score: number;
      }> = [];

      if (targetAgentId) {
        // Use specified target
        targetAgent = await this.getAgentProfile(targetAgentId, organizationId);
        if (!targetAgent) {
          return {
            success: false,
            escalationTarget: null,
            reasoning: 'Specified target agent not found',
            confidence: 0,
            alternativesConsidered: [],
            errorMessage: 'Target agent not found',
          };
        }

        // Validate escalation is valid (target has higher permissions)
        if (!this.canEscalateTo(initiatingAgent.role, targetAgent.role)) {
          return {
            success: false,
            escalationTarget: null,
            reasoning: `Cannot escalate from ${initiatingAgent.role} to ${targetAgent.role}`,
            confidence: 0,
            alternativesConsidered: [],
            errorMessage: 'Invalid escalation target - insufficient role level',
          };
        }

        reasoning = `Escalated to specified target: ${targetAgent.agentName}`;
        confidence = 1.0;
      } else {
        // Use GPT-4 to select best escalation target
        const selectionResult = await this.selectEscalationTarget(
          initiatingAgent,
          taskContext,
          failureReason,
          confidenceScore,
          requiredCapabilities,
          organizationId
        );

        targetAgent = selectionResult.selectedAgent;
        reasoning = selectionResult.reasoning;
        confidence = selectionResult.confidence;
        alternatives = selectionResult.alternatives;

        if (!targetAgent) {
          // Log failed escalation
          if (logEscalation) {
            await this.logCollaboration({
              collaborationType: 'escalation',
              initiatingAgentId: agentId,
              targetAgentIds: [],
              organizationId,
              taskContext: taskContext as Record<string, any>,
              reasoning,
              confidenceScore: confidence,
              alternativesConsidered: alternatives,
              executionIds: [],
              status: 'failed',
            });
          }

          return {
            success: false,
            escalationTarget: null,
            reasoning,
            confidence,
            alternativesConsidered: alternatives,
            errorMessage: 'No suitable escalation target found',
          };
        }
      }

      // Log escalation
      let escalationLogId: string | undefined;
      if (logEscalation) {
        escalationLogId = await this.logCollaboration({
          collaborationType: 'escalation',
          initiatingAgentId: agentId,
          targetAgentIds: [targetAgent.agentId],
          organizationId,
          taskContext: taskContext as Record<string, any>,
          reasoning,
          confidenceScore: confidence,
          alternativesConsidered: alternatives,
          executionIds: [],
          status: 'pending',
        });
      }

      return {
        success: true,
        escalationTarget: {
          agentId: targetAgent.agentId,
          agentName: targetAgent.agentName,
          role: targetAgent.role,
          capabilities: targetAgent.capabilities,
        },
        reasoning,
        confidence,
        alternativesConsidered: alternatives,
        escalationLogId,
      };
    } catch (error) {
      console.error('Error in escalateTaskToAgent:', error);
      return {
        success: false,
        escalationTarget: null,
        reasoning: 'Internal error during escalation',
        confidence: 0,
        alternativesConsidered: [],
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delegate a task to a specialized agent
   * Supports both synchronous and asynchronous delegation
   */
  async delegateTaskToAgent(
    delegateInput: DelegationRequest
  ): Promise<DelegationResult> {
    const {
      delegatingAgentId,
      organizationId,
      task,
      targetAgentId,
      mode,
      waitForCompletion = false,
      logDelegation = true,
    } = delegateInput;

    try {
      const taskId = uuidv4();

      // Get delegating agent profile
      const delegatingAgent = await this.getAgentProfile(delegatingAgentId, organizationId);
      if (!delegatingAgent) {
        return {
          success: false,
          delegatedTo: null,
          taskId,
          status: 'failed',
          errorMessage: 'Delegating agent not found',
        };
      }

      // Determine delegation target
      let targetAgent: AgentProfile | null = null;

      if (targetAgentId) {
        targetAgent = await this.getAgentProfile(targetAgentId, organizationId);
        if (!targetAgent) {
          return {
            success: false,
            delegatedTo: null,
            taskId,
            status: 'failed',
            errorMessage: 'Target agent not found',
          };
        }
      } else {
        // Use GPT-4 to find best agent for delegation
        const selectionResult = await this.selectDelegationTarget(
          delegatingAgent,
          task,
          organizationId
        );

        targetAgent = selectionResult.selectedAgent;

        if (!targetAgent) {
          return {
            success: false,
            delegatedTo: null,
            taskId,
            status: 'failed',
            errorMessage: `No suitable agent found for delegation: ${selectionResult.reasoning}`,
          };
        }
      }

      // Create delegation execution
      let executionId: string | undefined;
      let output: Record<string, any> | undefined;
      let status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';

      // For synchronous delegation, execute immediately
      if (mode === 'synchronous') {
        try {
          // Trigger playbook execution for the target agent
          const result = await agentPlaybookOrchestrator.triggerPlaybookForAgent({
            agentId: targetAgent.agentId,
            userPrompt: task.description,
            input: task.input,
            additionalContext: {
              organizationId,
            },
            logDecision: false, // Avoid double logging
          });

          executionId = result.executionId;
          status = result.status === 'success' ? 'completed' : 'failed';
          output = result.output;
        } catch (error) {
          console.error('Error executing delegated task:', error);
          status = 'failed';
        }
      } else if (mode === 'asynchronous') {
        // For asynchronous, just initiate (actual execution happens separately)
        status = 'pending';
      }

      // Log delegation
      let delegationLogId: string | undefined;
      if (logDelegation) {
        delegationLogId = await this.logCollaboration({
          collaborationType: 'delegation',
          initiatingAgentId: delegatingAgentId,
          targetAgentIds: [targetAgent.agentId],
          organizationId,
          taskContext: {
            taskId,
            task,
          },
          reasoning: `Delegated ${task.type || 'task'} to ${targetAgent.agentName} (${targetAgent.role})`,
          confidenceScore: 0.8, // Default confidence for delegation
          alternativesConsidered: [],
          executionIds: executionId ? [executionId] : [],
          status,
        });
      }

      return {
        success: true,
        delegatedTo: {
          agentId: targetAgent.agentId,
          agentName: targetAgent.agentName,
          specialization: targetAgent.specializations?.[0],
        },
        taskId,
        executionId,
        output,
        status,
        delegationLogId,
      };
    } catch (error) {
      console.error('Error in delegateTaskToAgent:', error);
      return {
        success: false,
        delegatedTo: null,
        taskId: uuidv4(),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Coordinate multiple agents on a workflow
   * Constructs a dynamic agent chain for complex multi-step workflows
   */
  async coordinateAgentsOnWorkflow(
    coordinationInput: CollaborationRequest
  ): Promise<CollaborationResult> {
    const {
      initiatingAgentId,
      organizationId,
      workflow,
      requiredRoles,
      participatingAgents,
      autoConstruct = true,
      logCollaboration = true,
    } = coordinationInput;

    const collaborationId = uuidv4();

    try {
      // Get initiating agent profile
      const initiatingAgent = await this.getAgentProfile(initiatingAgentId, organizationId);
      if (!initiatingAgent) {
        return {
          success: false,
          collaborationId,
          agentChain: [],
          status: 'failed',
          reasoning: 'Initiating agent not found',
          errorMessage: 'Agent not found',
        };
      }

      let agentChain: Array<{
        agentId: string;
        agentName?: string;
        role?: string;
        stepNumber: number;
        responsibility: string;
      }> = [];

      let reasoning = '';

      // Construct agent chain
      if (participatingAgents && participatingAgents.length > 0) {
        // Use specified agents
        for (const [index, participant] of participatingAgents.entries()) {
          const agent = await this.getAgentProfile(participant.agentId, organizationId);
          if (agent) {
            agentChain.push({
              agentId: agent.agentId,
              agentName: agent.agentName,
              role: agent.role,
              stepNumber: participant.step || index + 1,
              responsibility: `Step ${participant.step || index + 1} in workflow`,
            });
          }
        }

        reasoning = 'Using specified participating agents';
      } else if (autoConstruct && requiredRoles && requiredRoles.length > 0) {
        // Auto-construct chain based on required roles
        for (const [index, role] of requiredRoles.entries()) {
          const agents = await this.findAgents({
            organizationId,
            requiredRole: role,
            maxResults: 1,
          });

          if (agents.length > 0) {
            const agent = agents[0].agent;
            agentChain.push({
              agentId: agent.agentId,
              agentName: agent.agentName,
              role: agent.role,
              stepNumber: index + 1,
              responsibility: `${role} responsibilities in workflow`,
            });
          }
        }

        reasoning = `Auto-constructed agent chain based on required roles: ${requiredRoles.join(', ')}`;
      } else if (autoConstruct) {
        // Use GPT-4 to construct optimal agent chain
        const constructResult = await this.constructAgentChain(
          initiatingAgent,
          workflow,
          organizationId
        );

        agentChain = constructResult.agentChain;
        reasoning = constructResult.reasoning;
      } else {
        return {
          success: false,
          collaborationId,
          agentChain: [],
          status: 'failed',
          reasoning: 'No agent chain specified or constructed',
          errorMessage: 'Cannot coordinate without agent chain',
        };
      }

      if (agentChain.length === 0) {
        return {
          success: false,
          collaborationId,
          agentChain: [],
          status: 'failed',
          reasoning: 'No suitable agents found for workflow',
          errorMessage: 'Failed to construct agent chain',
        };
      }

      // Log collaboration
      let collaborationLogId: string | undefined;
      if (logCollaboration) {
        collaborationLogId = await this.logCollaboration({
          collaborationType: 'coordination',
          initiatingAgentId,
          targetAgentIds: agentChain.map(a => a.agentId),
          organizationId,
          taskContext: {
            collaborationId,
            workflow,
            agentChain,
          },
          reasoning,
          confidenceScore: 0.75,
          alternativesConsidered: [],
          executionIds: [],
          status: 'pending',
        });
      }

      return {
        success: true,
        collaborationId,
        agentChain,
        status: 'pending',
        reasoning,
        collaborationLogId,
      };
    } catch (error) {
      console.error('Error in coordinateAgentsOnWorkflow:', error);
      return {
        success: false,
        collaborationId,
        agentChain: [],
        status: 'failed',
        reasoning: 'Internal error during coordination',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Select escalation target using GPT-4
   */
  private async selectEscalationTarget(
    initiatingAgent: AgentProfile,
    taskContext: any,
    failureReason?: string,
    confidenceScore?: number,
    requiredCapabilities?: string[],
    organizationId?: string
  ): Promise<{
    selectedAgent: AgentProfile | null;
    reasoning: string;
    confidence: number;
    alternatives: Array<{
      agentId: string;
      agentName?: string;
      role?: string;
      reason: string;
      score: number;
    }>;
  }> {
    // Get eligible escalation targets
    const roleHierarchy = ROLE_HIERARCHY.find(r => r.role === initiatingAgent.role);
    if (!roleHierarchy || roleHierarchy.canEscalateTo.length === 0) {
      return {
        selectedAgent: null,
        reasoning: `No escalation path available for role: ${initiatingAgent.role}`,
        confidence: 0,
        alternatives: [],
      };
    }

    // Find agents with higher roles
    const eligibleAgents: AgentProfile[] = [];
    for (const role of roleHierarchy.canEscalateTo) {
      const agents = await this.findAgents({
        organizationId: organizationId || initiatingAgent.organizationId,
        requiredRole: role,
        requiredCapabilities,
        excludeAgentIds: [initiatingAgent.agentId],
        maxResults: 5,
      });

      eligibleAgents.push(...agents.map(m => m.agent));
    }

    if (eligibleAgents.length === 0) {
      return {
        selectedAgent: null,
        reasoning: 'No eligible agents found for escalation',
        confidence: 0,
        alternatives: [],
      };
    }

    // Use GPT-4 to select best escalation target
    const systemPrompt = this.buildEscalationSystemPrompt();
    const userPrompt = this.buildEscalationUserPrompt(
      initiatingAgent,
      taskContext,
      failureReason,
      confidenceScore,
      eligibleAgents
    );

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from GPT-4');
      }

      const result = JSON.parse(responseContent);

      const selectedAgentId = result.selectedAgentId;
      const selectedAgent = eligibleAgents.find(a => a.agentId === selectedAgentId) || null;

      return {
        selectedAgent,
        reasoning: result.reasoning,
        confidence: result.confidence,
        alternatives: result.alternatives || [],
      };
    } catch (error) {
      console.error('Error in GPT-4 escalation selection:', error);
      // Fallback: select highest-role agent
      const fallbackAgent = eligibleAgents.sort((a, b) => b.roleLevel - a.roleLevel)[0];
      return {
        selectedAgent: fallbackAgent,
        reasoning: 'Fallback to highest-role agent due to GPT-4 error',
        confidence: 0.5,
        alternatives: [],
      };
    }
  }

  /**
   * Select delegation target using GPT-4
   */
  private async selectDelegationTarget(
    delegatingAgent: AgentProfile,
    task: any,
    organizationId: string
  ): Promise<{
    selectedAgent: AgentProfile | null;
    reasoning: string;
  }> {
    // Find agents with relevant specializations
    const allAgents = await this.findAgents({
      organizationId,
      excludeAgentIds: [delegatingAgent.agentId],
      maxResults: 10,
    });

    if (allAgents.length === 0) {
      return {
        selectedAgent: null,
        reasoning: 'No other agents available for delegation',
      };
    }

    // Use GPT-4 to select best delegation target
    const systemPrompt = `You are selecting the best agent to delegate a task to.

Consider:
- Agent specializations and capabilities
- Task requirements
- Agent availability and workload

Response format (JSON):
{
  "selectedAgentId": "uuid or null",
  "reasoning": "explanation"
}`;

    const userPrompt = `Task: ${task.description}
Type: ${task.type || 'general'}

Available Agents:
${allAgents.map((m, i) => `${i + 1}. ${m.agent.agentName} (${m.agent.role})
   Specializations: ${m.agent.specializations?.join(', ') || 'None'}
   Capabilities: ${m.agent.capabilities.join(', ')}`).join('\n\n')}

Select the best agent for this task.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from GPT-4');
      }

      const result = JSON.parse(responseContent);
      const selectedAgent = allAgents.find(m => m.agent.agentId === result.selectedAgentId)?.agent || null;

      return {
        selectedAgent,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('Error in GPT-4 delegation selection:', error);
      return {
        selectedAgent: allAgents[0]?.agent || null,
        reasoning: 'Fallback to first available agent due to GPT-4 error',
      };
    }
  }

  /**
   * Construct agent chain using GPT-4
   */
  private async constructAgentChain(
    initiatingAgent: AgentProfile,
    workflow: any,
    organizationId: string
  ): Promise<{
    agentChain: Array<{
      agentId: string;
      agentName?: string;
      role?: string;
      stepNumber: number;
      responsibility: string;
    }>;
    reasoning: string;
  }> {
    // Get all available agents
    const allAgents = await this.findAgents({
      organizationId,
      maxResults: 20,
    });

    if (allAgents.length === 0) {
      return {
        agentChain: [{
          agentId: initiatingAgent.agentId,
          agentName: initiatingAgent.agentName,
          role: initiatingAgent.role,
          stepNumber: 1,
          responsibility: 'Complete entire workflow',
        }],
        reasoning: 'Only initiating agent available',
      };
    }

    // Use GPT-4 to construct workflow chain
    const systemPrompt = `You are constructing an optimal agent chain for a multi-step workflow.

Consider:
- Agent roles and capabilities
- Logical workflow steps
- Proper handoffs between agents

Response format (JSON):
{
  "agentChain": [
    {
      "agentId": "uuid",
      "stepNumber": 1,
      "responsibility": "description of what this agent does"
    }
  ],
  "reasoning": "explanation of the chain construction"
}`;

    const userPrompt = `Workflow: ${workflow.name}
Description: ${workflow.description}

Available Agents:
${allAgents.map((m, i) => `${i + 1}. ID: ${m.agent.agentId}
   Name: ${m.agent.agentName}
   Role: ${m.agent.role}
   Specializations: ${m.agent.specializations?.join(', ') || 'None'}`).join('\n\n')}

Construct an optimal agent chain for this workflow.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from GPT-4');
      }

      const result = JSON.parse(responseContent);

      // Map agent IDs to full profiles
      const agentChain = result.agentChain.map((step: any) => {
        const agent = allAgents.find(m => m.agent.agentId === step.agentId)?.agent;
        return {
          agentId: step.agentId,
          agentName: agent?.agentName,
          role: agent?.role,
          stepNumber: step.stepNumber,
          responsibility: step.responsibility,
        };
      });

      return {
        agentChain,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('Error in GPT-4 chain construction:', error);
      return {
        agentChain: [{
          agentId: initiatingAgent.agentId,
          agentName: initiatingAgent.agentName,
          role: initiatingAgent.role,
          stepNumber: 1,
          responsibility: 'Complete workflow',
        }],
        reasoning: 'Fallback to single agent due to GPT-4 error',
      };
    }
  }

  /**
   * Build GPT-4 system prompt for escalation
   */
  private buildEscalationSystemPrompt(): string {
    return `You are selecting the best agent to escalate a task to.

Consider:
- Agent role hierarchy (higher roles for more complex/sensitive tasks)
- Required capabilities
- Reason for escalation
- Confidence score of initiating agent

Rules:
- Select the agent with the most appropriate role and capabilities
- Higher roles for low confidence or complex tasks
- Consider specializations for domain-specific escalations

Response format (JSON):
{
  "selectedAgentId": "uuid or null",
  "reasoning": "explanation",
  "confidence": 0.85,
  "alternatives": [
    {
      "agentId": "uuid",
      "agentName": "name",
      "role": "role",
      "reason": "why considered",
      "score": 0.7
    }
  ]
}`;
  }

  /**
   * Build GPT-4 user prompt for escalation
   */
  private buildEscalationUserPrompt(
    initiatingAgent: AgentProfile,
    taskContext: any,
    failureReason?: string,
    confidenceScore?: number,
    eligibleAgents?: AgentProfile[]
  ): string {
    return `Escalation Request:

Initiating Agent: ${initiatingAgent.agentName} (${initiatingAgent.role})
Task: ${taskContext.prompt || JSON.stringify(taskContext)}
Failure Reason: ${failureReason || 'Not specified'}
Confidence Score: ${confidenceScore !== undefined ? confidenceScore : 'N/A'}

Eligible Escalation Targets:
${eligibleAgents?.map((agent, i) => `${i + 1}. ID: ${agent.agentId}
   Name: ${agent.agentName}
   Role: ${agent.role} (Level ${agent.roleLevel})
   Capabilities: ${agent.capabilities.join(', ')}
   Available: ${agent.isAvailable ? 'Yes' : 'No'}`).join('\n\n')}

Select the best agent for escalation.`;
  }

  /**
   * Get agent profile by ID
   */
  private async getAgentProfile(agentId: string, organizationId: string): Promise<AgentProfile | null> {
    // Mock implementation - replace with actual database query
    // This would query the agents table to get agent details
    const mockAgents: AgentProfile[] = [
      {
        agentId: 'agent-1',
        agentName: 'Assistant Agent',
        role: 'assistant',
        roleLevel: 1,
        capabilities: ['basic_tasks', 'data_retrieval'],
        specializations: ['customer_support'],
        organizationId,
        isAvailable: true,
      },
      {
        agentId: 'strategist-1',
        agentName: 'Strategy Agent',
        role: 'strategist',
        roleLevel: 3,
        capabilities: ['strategic_planning', 'decision_making', 'high_level_analysis'],
        specializations: ['marketing_strategy', 'business_development'],
        organizationId,
        isAvailable: true,
      },
    ];

    return mockAgents.find(a => a.agentId === agentId && a.organizationId === organizationId) || null;
  }

  /**
   * Find agents matching criteria
   */
  private async findAgents(request: FindAgentRequest): Promise<AgentMatch[]> {
    const {
      organizationId,
      requiredCapabilities,
      requiredRole,
      minRoleLevel,
      specialization,
      excludeAgentIds = [],
      maxResults = 10,
    } = request;

    // Mock implementation - replace with actual database query
    const mockAgents: AgentProfile[] = [
      {
        agentId: 'agent-1',
        agentName: 'Assistant Agent',
        role: 'assistant',
        roleLevel: 1,
        capabilities: ['basic_tasks', 'data_retrieval'],
        specializations: ['customer_support'],
        organizationId,
        isAvailable: true,
      },
      {
        agentId: 'strategist-1',
        agentName: 'Strategy Agent',
        role: 'strategist',
        roleLevel: 3,
        capabilities: ['strategic_planning', 'decision_making'],
        specializations: ['marketing_strategy'],
        organizationId,
        isAvailable: true,
      },
    ];

    const matches: AgentMatch[] = mockAgents
      .filter(agent => {
        if (excludeAgentIds.includes(agent.agentId)) return false;
        if (requiredRole && agent.role !== requiredRole) return false;
        if (minRoleLevel && agent.roleLevel < minRoleLevel) return false;
        return true;
      })
      .map(agent => ({
        agent,
        matchScore: 0.8,
        matchReason: 'Meets criteria',
        capabilitiesMatch: 1.0,
        roleMatch: true,
      }))
      .slice(0, maxResults);

    return matches;
  }

  /**
   * Check if escalation from one role to another is valid
   */
  private canEscalateTo(fromRole: string, toRole: string): boolean {
    const fromHierarchy = ROLE_HIERARCHY.find(r => r.role === fromRole);
    if (!fromHierarchy) return false;

    return fromHierarchy.canEscalateTo.includes(toRole);
  }

  /**
   * Log collaboration to database
   */
  private async logCollaboration(log: Omit<AgentCollaborationLogEntity, 'id' | 'created_at' | 'completed_at'>): Promise<string> {
    const logId = uuidv4();

    const logEntity: Omit<AgentCollaborationLogEntity, 'created_at' | 'completed_at'> = {
      id: logId,
      ...log,
    };

    const { error } = await supabase
      .from('agent_collaboration_logs')
      .insert(logEntity);

    if (error) {
      console.error('Error logging collaboration:', error);
      throw new Error(`Failed to log collaboration: ${error.message}`);
    }

    return logId;
  }
}

// Export singleton instance
export const agentCollaborationOrchestrator = new AgentCollaborationOrchestrator();
