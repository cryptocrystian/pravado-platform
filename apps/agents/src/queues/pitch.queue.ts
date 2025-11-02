// =====================================================
// PITCH QUEUE - Automated Email Sending
// =====================================================

import { Queue, Worker, Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// =====================================================
// QUEUE SETUP
// =====================================================

export const pitchQueue = new Queue('pitch', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});

// =====================================================
// WORKER
// =====================================================

const pitchWorker = new Worker(
  'pitch',
  async (job: Job) => {
    logger.info(`[PitchQueue] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case 'workflow-scheduler':
        return await runWorkflowScheduler();
      case 'generate-and-send-pitch':
        return await generateAndSendPitch(job);
      case 'send-pitch-batch':
        return await sendPitchBatch(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

// =====================================================
// WORKFLOW SCHEDULER
// =====================================================
// Runs every minute to check for workflows ready to execute

async function runWorkflowScheduler() {
  logger.info('[PitchQueue] Running workflow scheduler');

  // Find workflows that are SCHEDULED and ready to run
  const { data: workflows, error } = await supabase
    .from('pitch_workflows')
    .select('*')
    .eq('status', 'SCHEDULED')
    .lte('scheduled_at', new Date().toISOString())
    .is('deleted_at', null);

  if (error) {
    logger.error(`[PitchQueue] Error fetching scheduled workflows: ${error.message}`);
    return { error: error.message };
  }

  if (!workflows || workflows.length === 0) {
    logger.info('[PitchQueue] No workflows ready to run');
    return { workflowsProcessed: 0 };
  }

  logger.info(`[PitchQueue] Found ${workflows.length} workflows ready to run`);

  // Start each workflow
  for (const workflow of workflows) {
    try {
      await startWorkflowExecution(workflow);
    } catch (error: any) {
      logger.error(`[PitchQueue] Error starting workflow ${workflow.id}: ${error.message}`);
    }
  }

  return { workflowsProcessed: workflows.length };
}

async function startWorkflowExecution(workflow: any) {
  logger.info(`[PitchQueue] Starting workflow: ${workflow.id}`);

  // Update workflow status to RUNNING
  await supabase
    .from('pitch_workflows')
    .update({
      status: 'RUNNING',
      started_at: new Date().toISOString(),
    })
    .eq('id', workflow.id);

  // Get contacts that match filters
  const contacts = await getContactsForWorkflow(workflow);

  logger.info(`[PitchQueue] Found ${contacts.length} contacts for workflow ${workflow.id}`);

  // Create pitch jobs for each contact
  const jobs = contacts.map((contact: any) => ({
    workflow_id: workflow.id,
    contact_id: contact.id,
    subject: '',
    body: '',
    status: 'PENDING',
    organization_id: workflow.organization_id,
  }));

  if (jobs.length > 0) {
    await supabase.from('pitch_jobs').insert(jobs);
  }

  // Queue batches for sending
  const batchSize = workflow.batch_size || 50;
  const batchCount = Math.ceil(contacts.length / batchSize);

  for (let i = 0; i < batchCount; i++) {
    const delay = i * (workflow.batch_delay_minutes || 5) * 60 * 1000; // Convert minutes to ms
    await pitchQueue.add(
      'send-pitch-batch',
      {
        workflowId: workflow.id,
        batchIndex: i,
        batchSize,
      },
      {
        delay,
        jobId: `${workflow.id}-batch-${i}`,
      }
    );
  }

  logger.info(`[PitchQueue] Queued ${batchCount} batches for workflow ${workflow.id}`);
}

async function getContactsForWorkflow(workflow: any): Promise<any[]> {
  const filters = workflow.contact_filters || {};

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', workflow.organization_id)
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

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.error(`[PitchQueue] Error fetching contacts: ${error.message}`);
    return [];
  }

  return data || [];
}

// =====================================================
// BATCH SENDER
// =====================================================

async function sendPitchBatch(job: Job) {
  const { workflowId, batchIndex, batchSize } = job.data;

  logger.info(`[PitchQueue] Sending batch ${batchIndex} for workflow ${workflowId}`);

  // Get pending jobs for this workflow
  const { data: jobs, error } = await supabase
    .from('pitch_jobs')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    logger.error(`[PitchQueue] Error fetching batch jobs: ${error.message}`);
    return { error: error.message };
  }

  if (!jobs || jobs.length === 0) {
    logger.info(`[PitchQueue] No pending jobs for workflow ${workflowId}`);

    // Check if workflow is complete
    await checkWorkflowCompletion(workflowId);
    return { jobsProcessed: 0 };
  }

  logger.info(`[PitchQueue] Processing ${jobs.length} jobs in batch`);

  // Process each job
  for (const pitchJob of jobs) {
    await pitchQueue.add(
      'generate-and-send-pitch',
      {
        jobId: pitchJob.id,
        workflowId: pitchJob.workflow_id,
        contactId: pitchJob.contact_id,
        organizationId: pitchJob.organization_id,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      }
    );
  }

  return { jobsProcessed: jobs.length };
}

// =====================================================
// PITCH GENERATION & SENDING
// =====================================================

async function generateAndSendPitch(job: Job) {
  const { jobId, workflowId, contactId, organizationId } = job.data;

  logger.info(`[PitchQueue] Generating and sending pitch for job ${jobId}`);

  try {
    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('pitch_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found');
    }

    // Get contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

    // Generate personalized pitch
    const { subject, body } = generatePersonalizedPitch(workflow, contact);

    // Update job with generated content
    await supabase
      .from('pitch_jobs')
      .update({
        subject,
        body,
        status: 'SENDING',
      })
      .eq('id', jobId);

    // Send email (mocked for now)
    const emailResult = await sendEmail({
      to: contact.email,
      from: process.env.FROM_EMAIL || 'noreply@pravado.com',
      subject,
      body,
      trackOpens: true,
      trackClicks: true,
      customData: {
        jobId,
        workflowId,
        contactId,
      },
    });

    if (emailResult.success) {
      // Update job status
      await supabase
        .from('pitch_jobs')
        .update({
          status: 'SENT',
          message_id: emailResult.messageId,
          email_provider: 'mock',
          from_email: process.env.FROM_EMAIL || 'noreply@pravado.com',
          to_email: contact.email,
          sent_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Create event
      await supabase.from('pitch_events').insert({
        job_id: jobId,
        workflow_id: workflowId,
        event_type: 'SENT',
        occurred_at: new Date().toISOString(),
        organization_id: organizationId,
      });

      logger.info(`[PitchQueue] Successfully sent pitch for job ${jobId}`);
    } else {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    return { success: true, jobId };
  } catch (error: any) {
    logger.error(`[PitchQueue] Error sending pitch: ${error.message}`);

    // Update job with error
    await supabase
      .from('pitch_jobs')
      .update({
        status: 'FAILED',
        error_message: error.message,
        retry_count: job.attemptsMade,
      })
      .eq('id', jobId);

    throw error;
  }
}

function generatePersonalizedPitch(workflow: any, contact: any): { subject: string; body: string } {
  let subject = workflow.subject_template;
  let body = workflow.body_template;

  // Template interpolation
  const replacements: Record<string, string> = {
    'contact.full_name': contact.full_name || '',
    'contact.first_name': contact.first_name || '',
    'contact.last_name': contact.last_name || '',
    'contact.outlet': contact.outlet || '',
    'contact.position': contact.position || '',
    'contact.email': contact.email || '',
  };

  // Add custom variables
  const customVars = workflow.custom_variables || {};
  Object.keys(customVars).forEach((key) => {
    replacements[`var.${key}`] = customVars[key];
  });

  // Replace all placeholders
  Object.keys(replacements).forEach((key) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(pattern, replacements[key]);
    body = body.replace(pattern, replacements[key]);
  });

  return { subject, body };
}

// =====================================================
// EMAIL PROVIDER (MOCKED)
// =====================================================

async function sendEmail(message: {
  to: string;
  from: string;
  subject: string;
  body: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  customData?: Record<string, any>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Mock email sending
  // In production, integrate with SendGrid, Postmark, or AWS SES
  logger.info(`[EmailProvider] Sending email to ${message.to}: ${message.subject}`);

  // Simulate 95% success rate
  const success = Math.random() > 0.05;

  if (success) {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { success: true, messageId };
  } else {
    return { success: false, error: 'Mock email delivery failure' };
  }
}

// =====================================================
// WORKFLOW COMPLETION CHECK
// =====================================================

async function checkWorkflowCompletion(workflowId: string) {
  // Check if all jobs are complete (SENT, DELIVERED, FAILED, etc.)
  const { data: pendingJobs, error } = await supabase
    .from('pitch_jobs')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('status', 'PENDING')
    .limit(1);

  if (error) {
    logger.error(`[PitchQueue] Error checking completion: ${error.message}`);
    return;
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    logger.info(`[PitchQueue] Workflow ${workflowId} completed`);

    await supabase
      .from('pitch_workflows')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', workflowId);
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

pitchWorker.on('completed', (job) => {
  logger.info(`[PitchQueue] Job ${job.id} completed`);
});

pitchWorker.on('failed', (job, error) => {
  logger.error(`[PitchQueue] Job ${job?.id} failed: ${error.message}`);
});

logger.info('[PitchQueue] Worker started');

// =====================================================
// SCHEDULER - Run every minute
// =====================================================

setInterval(
  async () => {
    await pitchQueue.add('workflow-scheduler', {}, { jobId: `scheduler-${Date.now()}` });
  },
  60 * 1000 // 1 minute
);
