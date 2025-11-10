// =====================================================
// PLAYBOOK SERVICE
// Core Infrastructure: AI Playbook Management
// Provenance: Core infra (origin uncertain). Reviewed 2025-11-09.
// =====================================================

import { supabase } from '../config/supabase';
import {
  Playbook,
  PlaybookStep,
  PlaybookExecution,
  PlaybookStepResult,
  CreatePlaybookInput,
  UpdatePlaybookInput,
  CreatePlaybookStepInput,
  UpdatePlaybookStepInput,
  ExecutePlaybookInput,
  PlaybookStatus,
  PlaybookExecutionStatus,
  PlaybooksQueryFilters,
  ExecutionsQueryFilters,
  PlaybookWithSteps,
  PlaybookExecutionWithResults,
  PlaybookExecutionSummary,
  ExecutionProgress,
} from '@pravado/types';

// =====================================================
// PLAYBOOK CRUD OPERATIONS
// =====================================================

/**
 * Create a new playbook
 */
export async function createPlaybook(
  organizationId: string,
  userId: string,
  input: CreatePlaybookInput
): Promise<Playbook> {
  const { data, error } = await supabase
    .from('playbooks')
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description,
      category: input.category,
      tags: input.tags || [],
      agent_id: input.agentId,
      input_schema: input.inputSchema || {},
      output_schema: input.outputSchema || {},
      timeout_seconds: input.timeoutSeconds || 3600,
      max_retries: input.maxRetries || 3,
      retry_delay_seconds: input.retryDelaySeconds || 30,
      metadata: input.metadata || {},
      created_by: userId,
      updated_by: userId,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create playbook: ${error.message}`);
  }

  return mapPlaybookFromDb(data);
}

/**
 * Get playbook by ID
 */
export async function getPlaybookById(
  playbookId: string,
  organizationId: string
): Promise<Playbook | null> {
  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', playbookId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get playbook: ${error.message}`);
  }

  return mapPlaybookFromDb(data);
}

/**
 * Get playbook with steps
 */
export async function getPlaybookWithSteps(
  playbookId: string,
  organizationId: string
): Promise<PlaybookWithSteps | null> {
  const playbook = await getPlaybookById(playbookId, organizationId);
  if (!playbook) {
    return null;
  }

  const steps = await getPlaybookSteps(playbookId);

  return {
    ...playbook,
    steps,
  };
}

/**
 * List playbooks with filters
 */
export async function listPlaybooks(
  organizationId: string,
  filters?: PlaybooksQueryFilters
): Promise<{ playbooks: Playbook[]; total: number }> {
  let query = supabase
    .from('playbooks')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  // Apply filters
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.agentId) {
    query = query.eq('agent_id', filters.agentId);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  // Ordering
  const orderBy = filters?.orderBy || 'created_at';
  const orderDirection = filters?.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list playbooks: ${error.message}`);
  }

  return {
    playbooks: (data || []).map(mapPlaybookFromDb),
    total: count || 0,
  };
}

/**
 * Update playbook
 */
export async function updatePlaybook(
  playbookId: string,
  organizationId: string,
  userId: string,
  input: UpdatePlaybookInput
): Promise<Playbook> {
  const updateData: any = {
    updated_by: userId,
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.inputSchema !== undefined) updateData.input_schema = input.inputSchema;
  if (input.outputSchema !== undefined) updateData.output_schema = input.outputSchema;
  if (input.timeoutSeconds !== undefined) updateData.timeout_seconds = input.timeoutSeconds;
  if (input.maxRetries !== undefined) updateData.max_retries = input.maxRetries;
  if (input.retryDelaySeconds !== undefined) updateData.retry_delay_seconds = input.retryDelaySeconds;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const { data, error } = await supabase
    .from('playbooks')
    .update(updateData)
    .eq('id', playbookId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update playbook: ${error.message}`);
  }

  return mapPlaybookFromDb(data);
}

/**
 * Delete playbook
 */
export async function deletePlaybook(
  playbookId: string,
  organizationId: string
): Promise<void> {
  const { error } = await supabase
    .from('playbooks')
    .delete()
    .eq('id', playbookId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to delete playbook: ${error.message}`);
  }
}

// =====================================================
// PLAYBOOK STEP OPERATIONS
// =====================================================

/**
 * Create a playbook step
 */
export async function createPlaybookStep(
  playbookId: string,
  input: CreatePlaybookStepInput
): Promise<PlaybookStep> {
  const { data, error } = await supabase
    .from('playbook_steps')
    .insert({
      playbook_id: playbookId,
      step_name: input.stepName,
      step_type: input.stepType,
      step_order: input.stepOrder,
      description: input.description,
      config: input.config,
      input_schema: input.inputSchema || {},
      output_schema: input.outputSchema || {},
      input_mapping: input.inputMapping || {},
      condition: input.condition,
      timeout_seconds: input.timeoutSeconds || 300,
      max_retries: input.maxRetries || 2,
      is_optional: input.isOptional || false,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create playbook step: ${error.message}`);
  }

  return mapPlaybookStepFromDb(data);
}

/**
 * Get playbook steps
 */
export async function getPlaybookSteps(playbookId: string): Promise<PlaybookStep[]> {
  const { data, error } = await supabase
    .from('playbook_steps')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('step_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get playbook steps: ${error.message}`);
  }

  return (data || []).map(mapPlaybookStepFromDb);
}

/**
 * Update playbook step
 */
export async function updatePlaybookStep(
  stepId: string,
  input: UpdatePlaybookStepInput
): Promise<PlaybookStep> {
  const updateData: any = {};

  if (input.stepName !== undefined) updateData.step_name = input.stepName;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.config !== undefined) updateData.config = input.config;
  if (input.inputSchema !== undefined) updateData.input_schema = input.inputSchema;
  if (input.outputSchema !== undefined) updateData.output_schema = input.outputSchema;
  if (input.inputMapping !== undefined) updateData.input_mapping = input.inputMapping;
  if (input.condition !== undefined) updateData.condition = input.condition;
  if (input.onSuccessStepId !== undefined) updateData.on_success_step_id = input.onSuccessStepId;
  if (input.onFailureStepId !== undefined) updateData.on_failure_step_id = input.onFailureStepId;
  if (input.timeoutSeconds !== undefined) updateData.timeout_seconds = input.timeoutSeconds;
  if (input.maxRetries !== undefined) updateData.max_retries = input.maxRetries;
  if (input.isOptional !== undefined) updateData.is_optional = input.isOptional;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const { data, error } = await supabase
    .from('playbook_steps')
    .update(updateData)
    .eq('id', stepId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update playbook step: ${error.message}`);
  }

  return mapPlaybookStepFromDb(data);
}

/**
 * Delete playbook step
 */
export async function deletePlaybookStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('playbook_steps')
    .delete()
    .eq('id', stepId);

  if (error) {
    throw new Error(`Failed to delete playbook step: ${error.message}`);
  }
}

// =====================================================
// PLAYBOOK EXECUTION OPERATIONS
// =====================================================

/**
 * Create playbook execution
 */
export async function createPlaybookExecution(
  organizationId: string,
  userId: string,
  input: ExecutePlaybookInput
): Promise<PlaybookExecution> {
  // Get playbook with steps to initialize execution
  const playbook = await getPlaybookWithSteps(input.playbookId, organizationId);
  if (!playbook) {
    throw new Error('Playbook not found');
  }

  if (playbook.status !== PlaybookStatus.ACTIVE) {
    throw new Error('Cannot execute playbook that is not ACTIVE');
  }

  const { data, error } = await supabase
    .from('playbook_executions')
    .insert({
      playbook_id: input.playbookId,
      organization_id: organizationId,
      execution_name: input.executionName,
      triggered_by: userId,
      trigger_source: input.triggerSource || 'manual',
      input_data: input.inputData,
      output_data: {},
      total_steps: playbook.steps.length,
      completed_steps: 0,
      status: 'PENDING',
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create playbook execution: ${error.message}`);
  }

  return mapPlaybookExecutionFromDb(data);
}

/**
 * Get playbook execution by ID
 */
export async function getPlaybookExecution(
  executionId: string,
  organizationId: string
): Promise<PlaybookExecution | null> {
  const { data, error } = await supabase
    .from('playbook_executions')
    .select('*')
    .eq('id', executionId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get playbook execution: ${error.message}`);
  }

  return mapPlaybookExecutionFromDb(data);
}

/**
 * Get playbook execution with results
 */
export async function getPlaybookExecutionWithResults(
  executionId: string,
  organizationId: string
): Promise<PlaybookExecutionWithResults | null> {
  const execution = await getPlaybookExecution(executionId, organizationId);
  if (!execution) {
    return null;
  }

  const stepResults = await getExecutionStepResults(executionId);

  return {
    ...execution,
    stepResults,
  };
}

/**
 * List playbook executions with filters
 */
export async function listPlaybookExecutions(
  organizationId: string,
  filters?: ExecutionsQueryFilters
): Promise<{ executions: PlaybookExecution[]; total: number }> {
  let query = supabase
    .from('playbook_executions')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  // Apply filters
  if (filters?.playbookId) {
    query = query.eq('playbook_id', filters.playbookId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.triggeredBy) {
    query = query.eq('triggered_by', filters.triggeredBy);
  }

  if (filters?.triggerSource) {
    query = query.eq('trigger_source', filters.triggerSource);
  }

  if (filters?.startedAfter) {
    query = query.gte('started_at', filters.startedAfter);
  }

  if (filters?.startedBefore) {
    query = query.lte('started_at', filters.startedBefore);
  }

  // Ordering
  const orderBy = filters?.orderBy || 'created_at';
  const orderDirection = filters?.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list playbook executions: ${error.message}`);
  }

  return {
    executions: (data || []).map(mapPlaybookExecutionFromDb),
    total: count || 0,
  };
}

/**
 * Update playbook execution
 */
export async function updatePlaybookExecution(
  executionId: string,
  organizationId: string,
  updates: Partial<PlaybookExecution>
): Promise<PlaybookExecution> {
  const updateData: any = {};

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.currentStepId !== undefined) updateData.current_step_id = updates.currentStepId;
  if (updates.completedSteps !== undefined) updateData.completed_steps = updates.completedSteps;
  if (updates.outputData !== undefined) updateData.output_data = updates.outputData;
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
  if (updates.errorStack !== undefined) updateData.error_stack = updates.errorStack;
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

  const { data, error } = await supabase
    .from('playbook_executions')
    .update(updateData)
    .eq('id', executionId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update playbook execution: ${error.message}`);
  }

  return mapPlaybookExecutionFromDb(data);
}

// =====================================================
// STEP RESULT OPERATIONS
// =====================================================

/**
 * Create step result
 */
export async function createStepResult(
  executionId: string,
  stepId: string,
  inputData: Record<string, any>,
  attemptNumber: number = 1
): Promise<PlaybookStepResult> {
  const { data, error } = await supabase
    .from('playbook_step_results')
    .insert({
      execution_id: executionId,
      step_id: stepId,
      status: 'PENDING',
      attempt_number: attemptNumber,
      input_data: inputData,
      output_data: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create step result: ${error.message}`);
  }

  return mapStepResultFromDb(data);
}

/**
 * Get execution step results
 */
export async function getExecutionStepResults(
  executionId: string
): Promise<PlaybookStepResult[]> {
  const { data, error } = await supabase
    .from('playbook_step_results')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get step results: ${error.message}`);
  }

  return (data || []).map(mapStepResultFromDb);
}

/**
 * Update step result
 */
export async function updateStepResult(
  resultId: string,
  updates: Partial<PlaybookStepResult>
): Promise<PlaybookStepResult> {
  const updateData: any = {};

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.outputData !== undefined) updateData.output_data = updates.outputData;
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
  if (updates.errorStack !== undefined) updateData.error_stack = updates.errorStack;
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

  const { data, error } = await supabase
    .from('playbook_step_results')
    .update(updateData)
    .eq('id', resultId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update step result: ${error.message}`);
  }

  return mapStepResultFromDb(data);
}

// =====================================================
// ANALYTICS FUNCTIONS
// =====================================================

/**
 * Get playbook execution summary
 */
export async function getPlaybookExecutionSummary(
  playbookId: string
): Promise<PlaybookExecutionSummary> {
  const { data, error } = await supabase.rpc('get_playbook_execution_summary', {
    p_playbook_id: playbookId,
  });

  if (error) {
    throw new Error(`Failed to get execution summary: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      runningExecutions: 0,
      avgDurationMs: 0,
      successRate: 0,
    };
  }

  const summary = data[0];
  return {
    totalExecutions: Number(summary.total_executions),
    successfulExecutions: Number(summary.successful_executions),
    failedExecutions: Number(summary.failed_executions),
    runningExecutions: Number(summary.running_executions),
    avgDurationMs: Number(summary.avg_duration_ms),
    lastExecutionAt: summary.last_execution_at,
    successRate: Number(summary.success_rate),
  };
}

/**
 * Get execution progress
 */
export async function getExecutionProgress(
  executionId: string
): Promise<ExecutionProgress | null> {
  const { data, error } = await supabase.rpc('get_execution_progress', {
    p_execution_id: executionId,
  });

  if (error) {
    throw new Error(`Failed to get execution progress: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const progress = data[0];
  return {
    executionId: progress.execution_id,
    status: progress.status,
    progressPercentage: progress.progress_percentage,
    currentStepName: progress.current_step_name,
    completedSteps: progress.completed_steps,
    totalSteps: progress.total_steps,
    elapsedTimeMs: progress.elapsed_time_ms,
  };
}

// =====================================================
// MAPPING FUNCTIONS
// =====================================================

/**
 * Map database playbook to domain model
 */
function mapPlaybookFromDb(data: any): Playbook {
  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    description: data.description,
    version: data.version,
    status: data.status,
    tags: data.tags || [],
    category: data.category,
    agentId: data.agent_id,
    schemaVersion: data.schema_version,
    inputSchema: data.input_schema || {},
    outputSchema: data.output_schema || {},
    timeoutSeconds: data.timeout_seconds,
    maxRetries: data.max_retries,
    retryDelaySeconds: data.retry_delay_seconds,
    metadata: data.metadata || {},
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Map database playbook step to domain model
 */
function mapPlaybookStepFromDb(data: any): PlaybookStep {
  return {
    id: data.id,
    playbookId: data.playbook_id,
    stepName: data.step_name,
    stepType: data.step_type,
    stepOrder: data.step_order,
    description: data.description,
    config: data.config || {},
    inputSchema: data.input_schema || {},
    outputSchema: data.output_schema || {},
    inputMapping: data.input_mapping || {},
    condition: data.condition,
    onSuccessStepId: data.on_success_step_id,
    onFailureStepId: data.on_failure_step_id,
    timeoutSeconds: data.timeout_seconds,
    maxRetries: data.max_retries,
    isOptional: data.is_optional,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Map database playbook execution to domain model
 */
function mapPlaybookExecutionFromDb(data: any): PlaybookExecution {
  return {
    id: data.id,
    playbookId: data.playbook_id,
    organizationId: data.organization_id,
    executionName: data.execution_name,
    status: data.status,
    triggeredBy: data.triggered_by,
    triggerSource: data.trigger_source,
    inputData: data.input_data || {},
    outputData: data.output_data || {},
    errorMessage: data.error_message,
    errorStack: data.error_stack,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    durationMs: data.duration_ms,
    currentStepId: data.current_step_id,
    completedSteps: data.completed_steps,
    totalSteps: data.total_steps,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Map database step result to domain model
 */
function mapStepResultFromDb(data: any): PlaybookStepResult {
  return {
    id: data.id,
    executionId: data.execution_id,
    stepId: data.step_id,
    status: data.status,
    attemptNumber: data.attempt_number,
    inputData: data.input_data || {},
    outputData: data.output_data || {},
    errorMessage: data.error_message,
    errorStack: data.error_stack,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    durationMs: data.duration_ms,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
