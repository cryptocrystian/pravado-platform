// =====================================================
// AGENT TEMPLATE SERVICE
// =====================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  AgentTemplate,
  CreateAgentTemplateInput,
  UpdateAgentTemplateInput,
  AgentExecution,
  CreateAgentExecutionInput,
  UpdateAgentExecutionInput,
  AgentExecutionResult,
  CreateAgentExecutionResultInput,
  AgentStats,
  AgentExecutionStatus,
} from '@pravado/shared-types';

// =====================================================
// AGENT TEMPLATES
// =====================================================

export async function createAgentTemplate(
  input: CreateAgentTemplateInput,
  userId: string
): Promise<AgentTemplate> {
  logger.info(`[AgentTemplateService] Creating template: ${input.name}`);

  const slug = input.slug || generateSlug(input.name);

  const { data, error } = await supabase
    .from('agent_templates')
    .insert({
      name: input.name,
      slug,
      description: input.description,
      category: input.category,
      system_prompt: input.systemPrompt,
      input_schema: input.inputSchema,
      output_schema: input.outputSchema,
      example_input: input.exampleInput,
      example_output: input.exampleOutput,
      model: input.model || 'gpt-4-turbo-preview',
      temperature: input.temperature || 0.7,
      max_tokens: input.maxTokens || 2000,
      required_tools: input.requiredTools || [],
      context_sources: input.contextSources || [],
      tags: input.tags || [],
      is_public: input.isPublic || false,
      organization_id: input.organizationId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[AgentTemplateService] Error creating template: ${error.message}`);
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return mapToAgentTemplate(data);
}

export async function getAgentTemplate(id: string, organizationId: string): Promise<AgentTemplate | null> {
  const { data, error } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('id', id)
    .or(`organization_id.eq.${organizationId},is_public.eq.true`)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToAgentTemplate(data);
}

export async function listAgentTemplates(organizationId: string, category?: string): Promise<AgentTemplate[]> {
  let query = supabase
    .from('agent_templates')
    .select('*')
    .or(`organization_id.eq.${organizationId},is_public.eq.true`)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error(`[AgentTemplateService] Error listing templates: ${error.message}`);
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  return (data || []).map(mapToAgentTemplate);
}

export async function updateAgentTemplate(
  id: string,
  input: UpdateAgentTemplateInput,
  organizationId: string,
  userId: string
): Promise<AgentTemplate> {
  logger.info(`[AgentTemplateService] Updating template: ${id}`);

  const { data, error } = await supabase
    .from('agent_templates')
    .update({
      ...input,
      system_prompt: input.systemPrompt,
      input_schema: input.inputSchema,
      output_schema: input.outputSchema,
      example_input: input.exampleInput,
      example_output: input.exampleOutput,
      max_tokens: input.maxTokens,
      required_tools: input.requiredTools,
      context_sources: input.contextSources,
      is_public: input.isPublic,
      is_active: input.isActive,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    logger.error(`[AgentTemplateService] Error updating template: ${error.message}`);
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return mapToAgentTemplate(data);
}

export async function deleteAgentTemplate(id: string, organizationId: string): Promise<void> {
  logger.info(`[AgentTemplateService] Deleting template: ${id}`);

  const { error } = await supabase
    .from('agent_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error(`[AgentTemplateService] Error deleting template: ${error.message}`);
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

// =====================================================
// AGENT EXECUTIONS
// =====================================================

export async function createAgentExecution(input: CreateAgentExecutionInput, userId: string): Promise<AgentExecution> {
  logger.info(`[AgentTemplateService] Creating execution: ${input.agentName}`);

  const { data, error } = await supabase
    .from('agent_executions')
    .insert({
      template_id: input.templateId,
      agent_name: input.agentName,
      input_data: input.inputData,
      context_data: input.contextData,
      organization_id: input.organizationId,
      triggered_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[AgentTemplateService] Error creating execution: ${error.message}`);
    throw new Error(`Failed to create execution: ${error.message}`);
  }

  return mapToAgentExecution(data);
}

export async function getAgentExecution(id: string, organizationId: string): Promise<AgentExecution | null> {
  const { data, error } = await supabase
    .from('agent_executions')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToAgentExecution(data);
}

export async function listAgentExecutions(
  organizationId: string,
  filters?: {
    templateId?: string;
    status?: AgentExecutionStatus;
    limit?: number;
  }
): Promise<AgentExecution[]> {
  let query = supabase.from('agent_executions').select('*').eq('organization_id', organizationId);

  if (filters?.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false }).limit(filters?.limit || 50);

  const { data, error } = await query;

  if (error) {
    logger.error(`[AgentTemplateService] Error listing executions: ${error.message}`);
    throw new Error(`Failed to list executions: ${error.message}`);
  }

  return (data || []).map(mapToAgentExecution);
}

export async function updateAgentExecution(
  id: string,
  input: UpdateAgentExecutionInput,
  organizationId: string
): Promise<AgentExecution> {
  logger.info(`[AgentTemplateService] Updating execution: ${id}`);

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) updateData.status = input.status;
  if (input.outputData) updateData.output_data = input.outputData;
  if (input.startedAt) updateData.started_at = input.startedAt;
  if (input.completedAt) updateData.completed_at = input.completedAt;
  if (input.executionTimeMs) updateData.execution_time_ms = input.executionTimeMs;
  if (input.steps) updateData.steps = input.steps;
  if (input.currentStep !== undefined) updateData.current_step = input.currentStep;
  if (input.totalSteps) updateData.total_steps = input.totalSteps;
  if (input.errorMessage) updateData.error_message = input.errorMessage;
  if (input.errorDetails) updateData.error_details = input.errorDetails;
  if (input.tokensUsed) updateData.tokens_used = input.tokensUsed;
  if (input.estimatedCost) updateData.estimated_cost = input.estimatedCost;
  if (input.confidenceScore) updateData.confidence_score = input.confidenceScore;
  if (input.qualityScore) updateData.quality_score = input.qualityScore;

  const { data, error } = await supabase
    .from('agent_executions')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    logger.error(`[AgentTemplateService] Error updating execution: ${error.message}`);
    throw new Error(`Failed to update execution: ${error.message}`);
  }

  return mapToAgentExecution(data);
}

// =====================================================
// AGENT EXECUTION RESULTS
// =====================================================

export async function createAgentExecutionResult(
  input: CreateAgentExecutionResultInput
): Promise<AgentExecutionResult> {
  logger.info(`[AgentTemplateService] Creating execution result for: ${input.executionId}`);

  const { data, error } = await supabase
    .from('agent_execution_results')
    .insert({
      execution_id: input.executionId,
      result_type: input.resultType,
      result_data: input.resultData,
      title: input.title,
      summary: input.summary,
      organization_id: input.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[AgentTemplateService] Error creating result: ${error.message}`);
    throw new Error(`Failed to create result: ${error.message}`);
  }

  return mapToAgentExecutionResult(data);
}

export async function listAgentExecutionResults(
  executionId: string,
  organizationId: string
): Promise<AgentExecutionResult[]> {
  const { data, error } = await supabase
    .from('agent_execution_results')
    .select('*')
    .eq('execution_id', executionId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(`[AgentTemplateService] Error listing results: ${error.message}`);
    throw new Error(`Failed to list results: ${error.message}`);
  }

  return (data || []).map(mapToAgentExecutionResult);
}

// =====================================================
// STATISTICS
// =====================================================

export async function getAgentStats(organizationId: string): Promise<AgentStats> {
  const { data, error } = await supabase.rpc('get_agent_stats', { org_uuid: organizationId });

  if (error) {
    logger.error(`[AgentTemplateService] Error getting stats: ${error.message}`);
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  const stats = data[0] || {};

  return {
    totalExecutions: stats.total_executions || 0,
    successfulExecutions: stats.successful_executions || 0,
    failedExecutions: stats.failed_executions || 0,
    avgExecutionTimeMs: stats.avg_execution_time_ms || null,
    totalTokensUsed: stats.total_tokens_used || null,
    totalCost: stats.total_cost || null,
    popularAgents: stats.popular_agents || [],
  };
}

// =====================================================
// HELPERS
// =====================================================

function mapToAgentTemplate(data: any): AgentTemplate {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    category: data.category,
    systemPrompt: data.system_prompt,
    inputSchema: data.input_schema,
    outputSchema: data.output_schema,
    exampleInput: data.example_input,
    exampleOutput: data.example_output,
    model: data.model,
    temperature: data.temperature,
    maxTokens: data.max_tokens,
    requiredTools: data.required_tools,
    contextSources: data.context_sources,
    executionCount: data.execution_count,
    avgExecutionTimeMs: data.avg_execution_time_ms,
    successRate: data.success_rate,
    version: data.version,
    isActive: data.is_active,
    parentTemplateId: data.parent_template_id,
    tags: data.tags,
    isPublic: data.is_public,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapToAgentExecution(data: any): AgentExecution {
  return {
    id: data.id,
    templateId: data.template_id,
    agentName: data.agent_name,
    status: data.status,
    inputData: data.input_data,
    outputData: data.output_data,
    startedAt: data.started_at ? new Date(data.started_at) : null,
    completedAt: data.completed_at ? new Date(data.completed_at) : null,
    executionTimeMs: data.execution_time_ms,
    steps: data.steps,
    currentStep: data.current_step,
    totalSteps: data.total_steps,
    errorMessage: data.error_message,
    errorDetails: data.error_details,
    retryCount: data.retry_count,
    contextData: data.context_data,
    tokensUsed: data.tokens_used,
    estimatedCost: data.estimated_cost,
    confidenceScore: data.confidence_score,
    qualityScore: data.quality_score,
    organizationId: data.organization_id,
    triggeredBy: data.triggered_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapToAgentExecutionResult(data: any): AgentExecutionResult {
  return {
    id: data.id,
    executionId: data.execution_id,
    resultType: data.result_type,
    resultData: data.result_data,
    title: data.title,
    summary: data.summary,
    applied: data.applied,
    appliedAt: data.applied_at ? new Date(data.applied_at) : null,
    appliedTo: data.applied_to,
    appliedToId: data.applied_to_id,
    organizationId: data.organization_id,
    createdAt: new Date(data.created_at),
  };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
