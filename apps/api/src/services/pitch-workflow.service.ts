// =====================================================
// PITCH WORKFLOW SERVICE
// =====================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  PitchWorkflow,
  PitchJob,
  PitchEvent,
  PitchWorkflowStats,
  CreatePitchWorkflowInput,
  UpdatePitchWorkflowInput,
  CreatePitchJobInput,
  UpdatePitchJobInput,
  CreatePitchEventInput,
  PitchWorkflowStatus,
  PitchJobStatus,
} from '@pravado/shared-types';
import { runAgent } from '../../../agents/src/framework/agent-runner';
import { getAgentConfig } from '../../../agents/src/framework/agent-registry';

// =====================================================
// PITCH WORKFLOWS
// =====================================================

export async function createPitchWorkflow(
  input: CreatePitchWorkflowInput,
  userId: string
): Promise<PitchWorkflow> {
  logger.info(`[PitchWorkflowService] Creating workflow: ${input.name}`);

  // Get total contacts that match filters
  const totalContacts = await countContactsForFilters(input.contactFilters, input.organizationId);

  const { data, error } = await supabase
    .from('pitch_workflows')
    .insert({
      name: input.name,
      description: input.description,
      agent_template_id: input.agentTemplateId,
      agent_input_data: input.agentInputData || {},
      contact_filters: input.contactFilters,
      total_contacts: totalContacts,
      pitch_template_id: input.pitchTemplateId,
      subject_template: input.subjectTemplate,
      body_template: input.bodyTemplate,
      custom_variables: input.customVariables || {},
      scheduled_at: input.scheduledAt,
      send_window_start: input.sendWindowStart,
      send_window_end: input.sendWindowEnd,
      timezone: input.timezone || 'UTC',
      batch_size: input.batchSize || 50,
      batch_delay_minutes: input.batchDelayMinutes || 5,
      organization_id: input.organizationId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[PitchWorkflowService] Error creating workflow: ${error.message}`);
    throw new Error(`Failed to create workflow: ${error.message}`);
  }

  return mapToPitchWorkflow(data);
}

export async function getPitchWorkflow(id: string, organizationId: string): Promise<PitchWorkflow | null> {
  const { data, error } = await supabase
    .from('pitch_workflows')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToPitchWorkflow(data);
}

export async function listPitchWorkflows(
  organizationId: string,
  status?: PitchWorkflowStatus
): Promise<PitchWorkflow[]> {
  let query = supabase
    .from('pitch_workflows')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error(`[PitchWorkflowService] Error listing workflows: ${error.message}`);
    throw new Error(`Failed to list workflows: ${error.message}`);
  }

  return (data || []).map(mapToPitchWorkflow);
}

export async function updatePitchWorkflow(
  id: string,
  input: UpdatePitchWorkflowInput,
  organizationId: string,
  userId: string
): Promise<PitchWorkflow> {
  logger.info(`[PitchWorkflowService] Updating workflow: ${id}`);

  const updateData: any = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (input.name) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.agentTemplateId !== undefined) updateData.agent_template_id = input.agentTemplateId;
  if (input.agentInputData) updateData.agent_input_data = input.agentInputData;
  if (input.contactFilters) {
    updateData.contact_filters = input.contactFilters;
    // Recalculate total contacts
    updateData.total_contacts = await countContactsForFilters(input.contactFilters, organizationId);
  }
  if (input.pitchTemplateId !== undefined) updateData.pitch_template_id = input.pitchTemplateId;
  if (input.subjectTemplate) updateData.subject_template = input.subjectTemplate;
  if (input.bodyTemplate) updateData.body_template = input.bodyTemplate;
  if (input.customVariables) updateData.custom_variables = input.customVariables;
  if (input.scheduledAt !== undefined) updateData.scheduled_at = input.scheduledAt;
  if (input.sendWindowStart !== undefined) updateData.send_window_start = input.sendWindowStart;
  if (input.sendWindowEnd !== undefined) updateData.send_window_end = input.sendWindowEnd;
  if (input.timezone) updateData.timezone = input.timezone;
  if (input.batchSize) updateData.batch_size = input.batchSize;
  if (input.batchDelayMinutes) updateData.batch_delay_minutes = input.batchDelayMinutes;
  if (input.status) updateData.status = input.status;

  const { data, error } = await supabase
    .from('pitch_workflows')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    logger.error(`[PitchWorkflowService] Error updating workflow: ${error.message}`);
    throw new Error(`Failed to update workflow: ${error.message}`);
  }

  return mapToPitchWorkflow(data);
}

export async function deletePitchWorkflow(id: string, organizationId: string): Promise<void> {
  logger.info(`[PitchWorkflowService] Deleting workflow: ${id}`);

  const { error } = await supabase
    .from('pitch_workflows')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error(`[PitchWorkflowService] Error deleting workflow: ${error.message}`);
    throw new Error(`Failed to delete workflow: ${error.message}`);
  }
}

// =====================================================
// PITCH JOBS
// =====================================================

export async function createPitchJob(input: CreatePitchJobInput): Promise<PitchJob> {
  const { data, error } = await supabase
    .from('pitch_jobs')
    .insert({
      workflow_id: input.workflowId,
      contact_id: input.contactId,
      subject: input.subject,
      body: input.body,
      personalization_data: input.personalizationData,
      organization_id: input.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[PitchWorkflowService] Error creating job: ${error.message}`);
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return mapToPitchJob(data);
}

export async function getPitchJob(id: string, organizationId: string): Promise<PitchJob | null> {
  const { data, error } = await supabase
    .from('pitch_jobs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapToPitchJob(data);
}

export async function listPitchJobs(
  workflowId: string,
  organizationId: string,
  status?: PitchJobStatus
): Promise<PitchJob[]> {
  let query = supabase
    .from('pitch_jobs')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error(`[PitchWorkflowService] Error listing jobs: ${error.message}`);
    throw new Error(`Failed to list jobs: ${error.message}`);
  }

  return (data || []).map(mapToPitchJob);
}

export async function updatePitchJob(
  id: string,
  input: UpdatePitchJobInput,
  organizationId: string
): Promise<PitchJob> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) updateData.status = input.status;
  if (input.messageId) updateData.message_id = input.messageId;
  if (input.emailProvider) updateData.email_provider = input.emailProvider;
  if (input.fromEmail) updateData.from_email = input.fromEmail;
  if (input.toEmail) updateData.to_email = input.toEmail;
  if (input.sentAt) updateData.sent_at = input.sentAt;
  if (input.deliveredAt) updateData.delivered_at = input.deliveredAt;
  if (input.openedAt) updateData.opened_at = input.openedAt;
  if (input.clickedAt) updateData.clicked_at = input.clickedAt;
  if (input.repliedAt) updateData.replied_at = input.repliedAt;
  if (input.bouncedAt) updateData.bounced_at = input.bouncedAt;
  if (input.errorMessage) updateData.error_message = input.errorMessage;
  if (input.errorDetails) updateData.error_details = input.errorDetails;
  if (input.retryCount !== undefined) updateData.retry_count = input.retryCount;
  if (input.nextRetryAt) updateData.next_retry_at = input.nextRetryAt;

  const { data, error } = await supabase
    .from('pitch_jobs')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    logger.error(`[PitchWorkflowService] Error updating job: ${error.message}`);
    throw new Error(`Failed to update job: ${error.message}`);
  }

  return mapToPitchJob(data);
}

// =====================================================
// PITCH EVENTS
// =====================================================

export async function createPitchEvent(input: CreatePitchEventInput): Promise<PitchEvent> {
  const { data, error } = await supabase
    .from('pitch_events')
    .insert({
      job_id: input.jobId,
      workflow_id: input.workflowId,
      event_type: input.eventType,
      occurred_at: input.occurredAt || new Date().toISOString(),
      user_agent: input.userAgent,
      ip_address: input.ipAddress,
      location: input.location,
      link_url: input.linkUrl,
      webhook_data: input.webhookData,
      organization_id: input.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error(`[PitchWorkflowService] Error creating event: ${error.message}`);
    throw new Error(`Failed to create event: ${error.message}`);
  }

  return mapToPitchEvent(data);
}

export async function listPitchEvents(
  workflowId: string,
  organizationId: string
): Promise<PitchEvent[]> {
  const { data, error } = await supabase
    .from('pitch_events')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('organization_id', organizationId)
    .order('occurred_at', { ascending: false })
    .limit(100);

  if (error) {
    logger.error(`[PitchWorkflowService] Error listing events: ${error.message}`);
    throw new Error(`Failed to list events: ${error.message}`);
  }

  return (data || []).map(mapToPitchEvent);
}

// =====================================================
// WORKFLOW STATS
// =====================================================

export async function getPitchWorkflowStats(
  workflowId: string,
  organizationId: string
): Promise<PitchWorkflowStats> {
  const { data, error } = await supabase.rpc('get_pitch_workflow_stats', {
    workflow_uuid: workflowId,
  });

  if (error) {
    logger.error(`[PitchWorkflowService] Error getting stats: ${error.message}`);
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  const stats = data[0];
  const workflow = mapToPitchWorkflow(stats.workflow);
  const jobs = (stats.jobs || []).map(mapToPitchJob);
  const recentEvents = (stats.recent_events || []).map(mapToPitchEvent);

  const totalContacts = workflow.totalContacts;
  const sentRate = totalContacts > 0 ? workflow.sentCount / totalContacts : 0;
  const deliveryRate = workflow.sentCount > 0 ? workflow.deliveredCount / workflow.sentCount : 0;
  const openRate = workflow.deliveredCount > 0 ? workflow.openedCount / workflow.deliveredCount : 0;
  const clickRate = workflow.deliveredCount > 0 ? workflow.clickedCount / workflow.deliveredCount : 0;
  const replyRate = workflow.deliveredCount > 0 ? workflow.repliedCount / workflow.deliveredCount : 0;
  const bounceRate = workflow.sentCount > 0 ? workflow.bouncedCount / workflow.sentCount : 0;

  return {
    workflow,
    jobs,
    recentEvents,
    metrics: {
      totalContacts,
      sentRate,
      deliveryRate,
      openRate,
      clickRate,
      replyRate,
      bounceRate,
    },
  };
}

// =====================================================
// PITCH GENERATION
// =====================================================

export async function generatePitchForContact(
  workflowId: string,
  contactId: string,
  organizationId: string,
  userId: string
): Promise<{ subject: string; body: string; personalizationData: Record<string, any> }> {
  logger.info(`[PitchWorkflowService] Generating pitch for contact: ${contactId}`);

  // Get workflow
  const workflow = await getPitchWorkflow(workflowId, organizationId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Get contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('organization_id', organizationId)
    .single();

  if (contactError || !contact) {
    throw new Error('Contact not found');
  }

  let subject = workflow.subjectTemplate;
  let body = workflow.bodyTemplate;
  let personalizationData: Record<string, any> = {};

  // If agent template is configured, use it for generation
  if (workflow.agentTemplateId) {
    const agentConfig = getAgentConfig(workflow.agentTemplateId);
    if (agentConfig) {
      const result = await runAgent(
        agentConfig,
        {
          ...workflow.agentInputData,
          contact,
          customVariables: workflow.customVariables,
        },
        {
          organizationId,
          userId,
        }
      );

      if (result.success && result.data) {
        subject = result.data.subject || subject;
        body = result.data.body || body;
        personalizationData = result.data.personalization || {};
      }
    }
  }

  // Template interpolation with contact data
  subject = interpolateTemplate(subject, contact, workflow.customVariables);
  body = interpolateTemplate(body, contact, workflow.customVariables);

  return { subject, body, personalizationData };
}

// =====================================================
// HELPERS
// =====================================================

async function countContactsForFilters(
  filters: any,
  organizationId: string
): Promise<number> {
  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (filters.tier) {
    query = query.eq('tier', filters.tier);
  }

  if (filters.topics && filters.topics.length > 0) {
    query = query.contains('topics', filters.topics);
  }

  if (filters.regions && filters.regions.length > 0) {
    query = query.contains('regions', filters.regions);
  }

  if (filters.outletType) {
    query = query.eq('outlet_type', filters.outletType);
  }

  const { count, error } = await query;

  if (error) {
    logger.error(`[PitchWorkflowService] Error counting contacts: ${error.message}`);
    return 0;
  }

  return count || 0;
}

function interpolateTemplate(
  template: string,
  contact: any,
  customVariables: Record<string, any> = {}
): string {
  let result = template;

  // Replace {{contact.field}} with contact data
  const contactMatches = template.match(/\{\{contact\.(\w+)\}\}/g);
  if (contactMatches) {
    contactMatches.forEach((match) => {
      const field = match.replace(/\{\{contact\.(\w+)\}\}/, '$1');
      const value = contact[field] || '';
      result = result.replace(match, String(value));
    });
  }

  // Replace {{var.name}} with custom variables
  const varMatches = template.match(/\{\{var\.(\w+)\}\}/g);
  if (varMatches) {
    varMatches.forEach((match) => {
      const field = match.replace(/\{\{var\.(\w+)\}\}/, '$1');
      const value = customVariables[field] || '';
      result = result.replace(match, String(value));
    });
  }

  return result;
}

function mapToPitchWorkflow(data: any): PitchWorkflow {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
    agentTemplateId: data.agent_template_id,
    agentInputData: data.agent_input_data,
    contactFilters: data.contact_filters,
    totalContacts: data.total_contacts,
    pitchTemplateId: data.pitch_template_id,
    subjectTemplate: data.subject_template,
    bodyTemplate: data.body_template,
    customVariables: data.custom_variables,
    scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
    sendWindowStart: data.send_window_start,
    sendWindowEnd: data.send_window_end,
    timezone: data.timezone,
    batchSize: data.batch_size,
    batchDelayMinutes: data.batch_delay_minutes,
    startedAt: data.started_at ? new Date(data.started_at) : null,
    completedAt: data.completed_at ? new Date(data.completed_at) : null,
    pausedAt: data.paused_at ? new Date(data.paused_at) : null,
    sentCount: data.sent_count,
    deliveredCount: data.delivered_count,
    openedCount: data.opened_count,
    clickedCount: data.clicked_count,
    repliedCount: data.replied_count,
    bouncedCount: data.bounced_count,
    failedCount: data.failed_count,
    organizationId: data.organization_id,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
  };
}

function mapToPitchJob(data: any): PitchJob {
  return {
    id: data.id,
    workflowId: data.workflow_id,
    contactId: data.contact_id,
    status: data.status,
    subject: data.subject,
    body: data.body,
    personalizationData: data.personalization_data,
    emailProvider: data.email_provider,
    messageId: data.message_id,
    fromEmail: data.from_email,
    toEmail: data.to_email,
    sentAt: data.sent_at ? new Date(data.sent_at) : null,
    deliveredAt: data.delivered_at ? new Date(data.delivered_at) : null,
    openedAt: data.opened_at ? new Date(data.opened_at) : null,
    clickedAt: data.clicked_at ? new Date(data.clicked_at) : null,
    repliedAt: data.replied_at ? new Date(data.replied_at) : null,
    bouncedAt: data.bounced_at ? new Date(data.bounced_at) : null,
    errorMessage: data.error_message,
    errorDetails: data.error_details,
    retryCount: data.retry_count,
    maxRetries: data.max_retries,
    nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at) : null,
    organizationId: data.organization_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapToPitchEvent(data: any): PitchEvent {
  return {
    id: data.id,
    jobId: data.job_id,
    workflowId: data.workflow_id,
    eventType: data.event_type,
    occurredAt: new Date(data.occurred_at),
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
    location: data.location,
    linkUrl: data.link_url,
    webhookData: data.webhook_data,
    organizationId: data.organization_id,
    createdAt: new Date(data.created_at),
  };
}
