// =====================================================
// PRESS RELEASE SCHEDULER QUEUE
// =====================================================
// BullMQ queue for scheduling press release distribution based on embargo dates

import { Queue, Worker, Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ReleaseScheduleJobData {
  pressReleaseId: string;
  organizationId: string;
  userId: string;
}

interface PitchBatchJobData {
  pressReleaseId: string;
  organizationId: string;
  userId: string;
  contactIds: string[];
  templateId?: string;
}

// =====================================================
// QUEUE SETUP
// =====================================================

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

export const releaseSchedulerQueue = new Queue<ReleaseScheduleJobData>('release-scheduler', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

export const pitchBatchQueue = new Queue<PitchBatchJobData>('pitch-batch', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600,
    },
  },
});

// =====================================================
// WORKER: RELEASE SCHEDULER
// =====================================================

const releaseSchedulerWorker = new Worker<ReleaseScheduleJobData>(
  'release-scheduler',
  async (job: Job<ReleaseScheduleJobData>) => {
    const { pressReleaseId, organizationId, userId } = job.data;

    logger.info(`[ReleaseScheduler] Processing release: ${pressReleaseId}`);

    try {
      // Get press release
      const { data: release, error: releaseError } = await supabase
        .from('press_releases')
        .select('*')
        .eq('id', pressReleaseId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (releaseError || !release) {
        throw new Error(`Press release not found: ${pressReleaseId}`);
      }

      // Check embargo date
      if (release.embargo_date) {
        const embargoDate = new Date(release.embargo_date);
        const now = new Date();

        if (embargoDate > now) {
          logger.info(`[ReleaseScheduler] Release ${pressReleaseId} is still under embargo until ${embargoDate.toISOString()}`);
          throw new Error('Release is still under embargo');
        }
      }

      // Update status to SENDING
      const { error: updateError } = await supabase
        .from('press_releases')
        .update({
          status: 'SENDING',
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', pressReleaseId)
        .eq('organization_id', organizationId);

      if (updateError) {
        throw new Error(`Failed to update release status: ${updateError.message}`);
      }

      // Get recommended targets
      const { data: targets, error: targetsError } = await supabase.rpc('get_recommended_targets', {
        release_uuid: pressReleaseId,
        max_results: 500,
      });

      if (targetsError) {
        throw new Error(`Failed to get recommended targets: ${targetsError.message}`);
      }

      // Filter by targeting threshold
      const qualifiedTargets = (targets || [])
        .filter((t: any) => parseFloat(t.match_score) >= release.targeting_score_threshold)
        .map((t: any) => t.contact_id);

      // Also include explicitly targeted contacts
      const allTargets = Array.from(new Set([
        ...qualifiedTargets,
        ...(release.target_contact_ids || []),
      ]));

      logger.info(`[ReleaseScheduler] Found ${allTargets.length} qualified targets for release ${pressReleaseId}`);

      if (allTargets.length === 0) {
        logger.warn(`[ReleaseScheduler] No qualified targets found for release ${pressReleaseId}`);

        // Update to SENT even with no targets
        await supabase
          .from('press_releases')
          .update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', pressReleaseId);

        return { success: true, targetCount: 0 };
      }

      // Batch targets into groups of 50 to avoid overwhelming the system
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < allTargets.length; i += batchSize) {
        batches.push(allTargets.slice(i, i + batchSize));
      }

      // Queue pitch generation and sending for each batch
      for (let i = 0; i < batches.length; i++) {
        await pitchBatchQueue.add(
          `pitch-batch-${pressReleaseId}-${i}`,
          {
            pressReleaseId,
            organizationId,
            userId,
            contactIds: batches[i],
          },
          {
            delay: i * 5000, // Stagger batches by 5 seconds
          }
        );
      }

      logger.info(`[ReleaseScheduler] Queued ${batches.length} pitch batches for release ${pressReleaseId}`);

      return {
        success: true,
        targetCount: allTargets.length,
        batchCount: batches.length,
      };
    } catch (error: any) {
      logger.error(`[ReleaseScheduler] Error processing release ${pressReleaseId}: ${error.message}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

// =====================================================
// WORKER: PITCH BATCH
// =====================================================

const pitchBatchWorker = new Worker<PitchBatchJobData>(
  'pitch-batch',
  async (job: Job<PitchBatchJobData>) => {
    const { pressReleaseId, organizationId, userId, contactIds, templateId } = job.data;

    logger.info(`[PitchBatch] Processing batch of ${contactIds.length} contacts for release: ${pressReleaseId}`);

    try {
      // Get press release
      const { data: release, error: releaseError } = await supabase
        .from('press_releases')
        .select('*')
        .eq('id', pressReleaseId)
        .eq('organization_id', organizationId)
        .single();

      if (releaseError || !release) {
        throw new Error(`Press release not found: ${pressReleaseId}`);
      }

      // Get contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds)
        .eq('organization_id', organizationId);

      if (contactsError) {
        throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
      }

      let successCount = 0;
      let failedCount = 0;

      // Process each contact
      for (const contact of contacts || []) {
        try {
          // Generate personalized pitch
          const pitch = await generatePersonalizedPitch(release, contact, templateId);

          // Create interaction record
          const { error: interactionError } = await supabase
            .from('campaign_interactions')
            .insert({
              campaign_id: release.campaign_id,
              press_release_id: pressReleaseId,
              contact_id: contact.id,
              interaction_type: 'PITCH_SENT',
              channel: 'email',
              pitch_subject: pitch.subject,
              pitch_body: pitch.body,
              personalization_data: pitch.personalizationData,
              sent_at: new Date().toISOString(),
              organization_id: organizationId,
              user_id: userId,
            });

          if (interactionError) {
            logger.error(`[PitchBatch] Failed to create interaction for contact ${contact.id}: ${interactionError.message}`);
            failedCount++;
            continue;
          }

          // TODO: Integrate with email service (SendGrid, Postmark, etc.)
          // For now, we just log that we would send
          logger.info(`[PitchBatch] Would send pitch to ${contact.email}: "${pitch.subject}"`);

          successCount++;

          // Rate limiting: wait 100ms between sends
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          logger.error(`[PitchBatch] Error processing contact ${contact.id}: ${error.message}`);
          failedCount++;
        }
      }

      logger.info(`[PitchBatch] Batch complete for release ${pressReleaseId}: ${successCount} sent, ${failedCount} failed`);

      // Check if all batches are complete
      const { data: allInteractions } = await supabase
        .from('campaign_interactions')
        .select('id')
        .eq('press_release_id', pressReleaseId)
        .eq('interaction_type', 'PITCH_SENT');

      const totalSent = allInteractions?.length || 0;

      // Update press release status to SENT if this looks like the final batch
      const { data: releaseCheck } = await supabase
        .from('press_releases')
        .select('status')
        .eq('id', pressReleaseId)
        .single();

      if (releaseCheck?.status === 'SENDING') {
        // Simple heuristic: if we've sent to most targets, mark as SENT
        // A more robust solution would track batch completion separately
        await supabase
          .from('press_releases')
          .update({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', pressReleaseId);
      }

      return {
        success: true,
        successCount,
        failedCount,
        totalSent,
      };
    } catch (error: any) {
      logger.error(`[PitchBatch] Error processing batch for release ${pressReleaseId}: ${error.message}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 3 }
);

// =====================================================
// HELPERS
// =====================================================

async function generatePersonalizedPitch(
  release: any,
  contact: any,
  templateId?: string
): Promise<{ subject: string; body: string; personalizationData: Record<string, unknown> }> {
  // Get template if provided
  let systemPrompt = `You are an expert PR professional writing personalized pitches to media contacts.

Your goal is to craft compelling, concise email pitches that:
1. Grab attention with a personalized opening
2. Clearly explain the news value and relevance to the recipient
3. Include a clear call-to-action
4. Maintain a professional yet conversational tone
5. Keep the pitch under 200 words

Output format:
{
  "subject": "Email subject line (under 60 characters)",
  "body": "Full email body in markdown format",
  "personalization": {
    "key": "value pairs of personalization data used"
  }
}`;

  if (templateId) {
    const { data: template } = await supabase
      .from('pitch_templates')
      .select('ai_prompt')
      .eq('id', templateId)
      .single();

    if (template?.ai_prompt) {
      systemPrompt = template.ai_prompt;
    }
  }

  const userPrompt = `Generate a personalized pitch for this press release to the following contact:

PRESS RELEASE:
Title: ${release.title}
${release.subtitle ? `Subtitle: ${release.subtitle}` : ''}

Summary: ${release.ai_summary || 'No summary available'}

Key Messages:
${(release.key_messages || []).map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}

Full Content (first 1000 chars):
${release.body_md.substring(0, 1000)}...

CONTACT DETAILS:
Name: ${contact.full_name}
Title: ${contact.title || 'Unknown'}
Outlet: ${contact.outlet || 'Unknown'}
Topics: ${(contact.topics || []).join(', ') || 'Unknown'}
Bio: ${contact.bio || 'No bio available'}

Generate a personalized pitch that appeals to this contact's interests and beat.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');

  return {
    subject: result.subject || `Re: ${release.title}`,
    body: result.body || '',
    personalizationData: result.personalization || {},
  };
}

// =====================================================
// SCHEDULER: CHECK EMBARGOED RELEASES
// =====================================================

// Run every hour to check for releases past embargo date
setInterval(async () => {
  try {
    logger.info('[ReleaseScheduler] Checking for releases past embargo date...');

    const { data: releases, error } = await supabase
      .from('press_releases')
      .select('id, organization_id, created_by')
      .eq('status', 'SCHEDULED')
      .lte('embargo_date', new Date().toISOString())
      .is('deleted_at', null);

    if (error) {
      logger.error(`[ReleaseScheduler] Error fetching embargoed releases: ${error.message}`);
      return;
    }

    if (!releases || releases.length === 0) {
      logger.info('[ReleaseScheduler] No releases ready to send');
      return;
    }

    logger.info(`[ReleaseScheduler] Found ${releases.length} releases ready to send`);

    for (const release of releases) {
      await releaseSchedulerQueue.add(
        `release-${release.id}`,
        {
          pressReleaseId: release.id,
          organizationId: release.organization_id,
          userId: release.created_by,
        },
        {
          priority: 1, // High priority for embargoed releases
        }
      );
    }
  } catch (error: any) {
    logger.error(`[ReleaseScheduler] Error in embargo checker: ${error.message}`);
  }
}, 60 * 60 * 1000); // Every hour

// =====================================================
// EVENT HANDLERS
// =====================================================

releaseSchedulerWorker.on('completed', (job) => {
  logger.info(`[ReleaseScheduler] Job ${job.id} completed successfully`);
});

releaseSchedulerWorker.on('failed', (job, error) => {
  logger.error(`[ReleaseScheduler] Job ${job?.id} failed: ${error.message}`);
});

pitchBatchWorker.on('completed', (job) => {
  logger.info(`[PitchBatch] Job ${job.id} completed successfully`);
});

pitchBatchWorker.on('failed', (job, error) => {
  logger.error(`[PitchBatch] Job ${job?.id} failed: ${error.message}`);
});

logger.info('[ReleaseScheduler] Workers started');

// =====================================================
// EXPORTS
// =====================================================

export async function scheduleRelease(
  pressReleaseId: string,
  organizationId: string,
  userId: string,
  embargoDate?: Date
): Promise<void> {
  const delay = embargoDate
    ? Math.max(0, embargoDate.getTime() - Date.now())
    : 0;

  await releaseSchedulerQueue.add(
    `release-${pressReleaseId}`,
    {
      pressReleaseId,
      organizationId,
      userId,
    },
    {
      delay,
      priority: delay > 0 ? 5 : 1, // Higher priority for immediate sends
    }
  );

  logger.info(`[ReleaseScheduler] Scheduled release ${pressReleaseId}${embargoDate ? ` for ${embargoDate.toISOString()}` : ' for immediate sending'}`);
}
