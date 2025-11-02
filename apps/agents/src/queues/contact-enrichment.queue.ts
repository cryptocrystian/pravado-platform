// =====================================================
// CONTACT ENRICHMENT QUEUE
// =====================================================
// Background queue for enriching contact data via APIs

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

const connection = new Redis(
  process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Job Data Interface
interface ContactEnrichmentJobData {
  jobId: string;
  contactIds: string[];
  organizationId: string;
}

interface EnrichmentUpdate {
  bio?: string;
  followerCount?: number;
  recentArticles?: Array<{
    title: string;
    url: string;
    publishedAt: Date;
  }>;
}

// Contact Enrichment Queue
export const contactEnrichmentQueue = new Queue<ContactEnrichmentJobData>(
  'contact-enrichment',
  {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: {
        count: 50,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 200,
      },
    },
  }
);

/**
 * Enqueue contact enrichment job
 */
export async function enqueueContactEnrichment(data: ContactEnrichmentJobData) {
  logger.info(`Enqueueing contact enrichment for job ${data.jobId}`);

  const job = await contactEnrichmentQueue.add(
    'enrich-contacts',
    data,
    {
      jobId: `enrichment-${data.jobId}`,
      priority: 5,
    }
  );

  logger.info(`Contact enrichment job created: ${job.id}`);
  return job.id;
}

/**
 * Enrich a single contact using AI and external APIs
 */
async function enrichContact(contact: any): Promise<{ success: boolean; updates?: EnrichmentUpdate; error?: string }> {
  try {
    logger.info(`Enriching contact: ${contact.id} (${contact.full_name})`);

    const updates: EnrichmentUpdate = {};

    // Generate bio using GPT-4 if we have enough information
    if (!contact.bio && (contact.outlet || contact.title)) {
      try {
        const prompt = `Generate a professional 2-3 sentence bio for a media contact with the following information:
- Name: ${contact.full_name}
${contact.title ? `- Title: ${contact.title}` : ''}
${contact.outlet ? `- Outlet: ${contact.outlet}` : ''}
${contact.role ? `- Role: ${contact.role}` : ''}
${contact.topics && contact.topics.length > 0 ? `- Topics: ${contact.topics.join(', ')}` : ''}

Keep it concise, professional, and relevant for PR outreach purposes.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a professional bio writer for media contacts. Generate concise, accurate bios.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });

        const bio = completion.choices[0]?.message?.content;
        if (bio) {
          updates.bio = bio.trim();
        }
      } catch (error) {
        logger.error(`Failed to generate bio for contact ${contact.id}`, error);
      }
    }

    // Mock social follower count (in production, would use Twitter/LinkedIn APIs)
    if (contact.twitter_url && !contact.follower_count) {
      // Mock enrichment - in production, call Twitter API
      updates.followerCount = Math.floor(Math.random() * 50000) + 1000;
    }

    // Mock recent articles (in production, would scrape or use news APIs)
    if (contact.outlet && (!contact.recent_articles || contact.recent_articles.length === 0)) {
      // Mock enrichment - in production, would fetch real articles
      updates.recentArticles = [
        {
          title: `Recent article by ${contact.full_name}`,
          url: `https://example.com/article-${Date.now()}`,
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        },
      ];
    }

    // If we have updates, return them
    if (Object.keys(updates).length > 0) {
      return { success: true, updates };
    }

    return { success: true, updates: {} };
  } catch (error) {
    logger.error(`Failed to enrich contact ${contact.id}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process contact enrichment job
 */
async function processContactEnrichment(job: Job<ContactEnrichmentJobData>) {
  const { jobId, contactIds, organizationId } = job.data;
  const startTime = Date.now();

  logger.info(`Processing contact enrichment job ${jobId} for ${contactIds.length} contacts`);

  try {
    // Update job status to PROCESSING
    await supabase
      .from('contact_enrichment_jobs')
      .update({
        status: 'PROCESSING',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Fetch contacts
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', contactIds)
      .eq('organization_id', organizationId);

    if (fetchError || !contacts) {
      throw new Error(`Failed to fetch contacts: ${fetchError?.message}`);
    }

    // Process each contact
    const results = await Promise.all(
      contacts.map((contact) => enrichContact(contact))
    );

    // Apply updates to database
    const enriched: string[] = [];
    const failed: string[] = [];
    const updateMap: Record<string, any> = {};

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const result = results[i];

      if (result.success && result.updates && Object.keys(result.updates).length > 0) {
        // Update contact in database
        const { error: updateError } = await supabase
          .from('contacts')
          .update(result.updates)
          .eq('id', contact.id);

        if (updateError) {
          logger.error(`Failed to update contact ${contact.id}`, updateError);
          failed.push(contact.id);
        } else {
          enriched.push(contact.id);
          updateMap[contact.id] = result.updates;
        }
      } else if (!result.success) {
        failed.push(contact.id);
      }
    }

    const executionTime = Date.now() - startTime;

    // Update job with results
    await supabase
      .from('contact_enrichment_jobs')
      .update({
        status: enriched.length > 0 ? 'COMPLETED' : 'FAILED',
        enriched_count: enriched.length,
        failed_count: failed.length,
        result: {
          enriched,
          failed,
          updates: updateMap,
        },
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
      })
      .eq('id', jobId);

    logger.info(`Contact enrichment job ${jobId} completed: ${enriched.length} enriched, ${failed.length} failed`);

    return {
      enriched: enriched.length,
      failed: failed.length,
      executionTime,
    };
  } catch (error) {
    logger.error(`Contact enrichment job ${jobId} failed`, error);

    // Update job with error
    await supabase
      .from('contact_enrichment_jobs')
      .update({
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      })
      .eq('id', jobId);

    throw error;
  }
}

/**
 * Start contact enrichment worker
 */
export function startContactEnrichmentWorker() {
  const worker = new Worker<ContactEnrichmentJobData>(
    'contact-enrichment',
    async (job) => {
      await processContactEnrichment(job);
    },
    {
      connection,
      concurrency: 3, // Process 3 enrichment jobs concurrently
      limiter: {
        max: 5, // Max 5 jobs per minute (to respect API rate limits)
        duration: 60000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Contact enrichment job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Contact enrichment job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Contact enrichment worker error:', err);
  });

  logger.info('Contact enrichment worker started');

  return worker;
}

// Cleanup handlers
connection.on('error', (err) => {
  logger.error('Redis connection error (contact enrichment):', err);
});

connection.on('connect', () => {
  logger.info('Connected to Redis for contact enrichment queue');
});
