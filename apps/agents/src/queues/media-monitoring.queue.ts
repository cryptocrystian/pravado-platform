// =====================================================
// MEDIA MONITORING QUEUE
// =====================================================
// Async processing for media mention ingestion and enrichment

import { Queue, Worker, Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { mediaMonitoringAgent } from '../flows/media-monitoring.agent';
import type { CreateMentionInput } from '@pravado/shared-types';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// =====================================================
// QUEUE DEFINITION
// =====================================================

export const mediaMonitoringQueue = new Queue('media-monitoring', {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

// =====================================================
// JOB TYPES
// =====================================================

interface IngestMentionJob {
  mention: CreateMentionInput;
  fullContent?: string;
}

interface EnrichMentionJob {
  mentionId: string;
  organizationId: string;
}

interface CheckDuplicatesJob {
  organizationId: string;
  batchSize?: number;
}

interface TriggerAlertsJob {
  mentionId: string;
  organizationId: string;
}

// =====================================================
// WORKERS
// =====================================================

/**
 * Worker: Ingest and analyze new mentions
 */
const ingestMentionWorker = new Worker<IngestMentionJob>(
  'media-monitoring',
  async (job: Job<IngestMentionJob>) => {
    const { mention, fullContent } = job.data;

    logger.info('[MediaMonitoring] Processing mention ingestion', {
      jobId: job.id,
      title: mention.title,
    });

    try {
      // Calculate content hash for deduplication
      const contentHash = mediaMonitoringAgent.calculateContentHash(
        mention.title,
        mention.excerpt || ''
      );

      // Check for duplicates
      const { data: existingMention } = await supabase
        .from('media_mentions')
        .select('id')
        .eq('content_hash', contentHash)
        .eq('organization_id', mention.organizationId)
        .single();

      if (existingMention) {
        logger.info('[MediaMonitoring] Duplicate mention detected', {
          contentHash,
          existingMentionId: existingMention.id,
        });

        // Mark as duplicate
        const { data, error } = await supabase
          .from('media_mentions')
          .insert({
            ...mapMentionToDb(mention),
            content_hash: contentHash,
            is_duplicate: true,
            original_mention_id: existingMention.id,
            nlp_processed: false,
          })
          .select()
          .single();

        if (error) throw error;

        return { success: true, isDuplicate: true, mentionId: data.id };
      }

      // Not a duplicate - proceed with NLP analysis
      logger.info('[MediaMonitoring] Performing NLP analysis');

      const analysis = await mediaMonitoringAgent.analyzeMention(mention, fullContent);

      // Insert mention with NLP analysis
      const { data, error } = await supabase
        .from('media_mentions')
        .insert({
          ...mapMentionToDb(mention),
          content_hash: contentHash,
          full_content: fullContent || null,
          is_duplicate: false,

          // NLP Results
          sentiment: analysis.sentiment,
          sentiment_score: analysis.sentimentScore,
          tone: analysis.tone,
          stance: analysis.stance,
          emotion: analysis.emotion,
          relevance_score: analysis.relevanceScore,
          visibility_score: analysis.visibilityScore,
          virality_score: analysis.viralityScore,
          is_viral: analysis.viralityScore >= 75,
          detected_entities: analysis.detectedEntities,
          entity_tags: analysis.entityTags,
          content_embedding: analysis.confidenceScore > 0.5 ? [] : null, // TODO: Add actual embedding

          // NLP Metadata
          nlp_processed: true,
          nlp_processed_at: new Date().toISOString(),
          nlp_confidence_score: analysis.confidenceScore,
          nlp_tokens_used: analysis.tokensUsed,
        })
        .select()
        .single();

      if (error) {
        logger.error('[MediaMonitoring] Failed to insert mention', error);
        throw error;
      }

      logger.info('[MediaMonitoring] Mention ingested successfully', {
        mentionId: data.id,
        sentiment: analysis.sentiment,
        relevanceScore: analysis.relevanceScore,
      });

      // Queue alert checking
      await mediaMonitoringQueue.add('trigger-alerts', {
        mentionId: data.id,
        organizationId: mention.organizationId,
      });

      return {
        success: true,
        isDuplicate: false,
        mentionId: data.id,
        analysis,
      };
    } catch (error) {
      logger.error('[MediaMonitoring] Mention ingestion failed', error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 5,
  }
);

/**
 * Worker: Trigger alerts for matching rules
 */
const triggerAlertsWorker = new Worker<TriggerAlertsJob>(
  'media-monitoring',
  async (job: Job<TriggerAlertsJob>) => {
    const { mentionId, organizationId } = job.data;

    logger.info('[MediaMonitoring] Checking alert rules', {
      jobId: job.id,
      mentionId,
    });

    try {
      // Get all active rules for this organization
      const { data: rules } = await supabase
        .from('monitoring_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (!rules || rules.length === 0) {
        logger.info('[MediaMonitoring] No active rules found');
        return { alertsTriggered: 0 };
      }

      let alertsTriggered = 0;

      // Check each rule
      for (const rule of rules) {
        const { data: matches } = await supabase.rpc('check_rule_match', {
          mention_uuid: mentionId,
          rule_uuid: rule.id,
        });

        if (matches) {
          // Create alert
          const { error } = await supabase.from('mention_alerts').insert({
            rule_id: rule.id,
            mention_id: mentionId,
            alert_channel: rule.alert_channel,
            alert_title: `New ${rule.entity_type} mention detected`,
            alert_message: `A new mention matching rule "${rule.name}" has been detected`,
            organization_id: organizationId,
          });

          if (!error) {
            alertsTriggered++;

            // Update rule trigger count
            await supabase
              .from('monitoring_rules')
              .update({
                trigger_count: rule.trigger_count + 1,
                last_triggered_at: new Date().toISOString(),
              })
              .eq('id', rule.id);

            logger.info('[MediaMonitoring] Alert triggered', {
              ruleId: rule.id,
              ruleName: rule.name,
            });
          }
        }
      }

      return { alertsTriggered };
    } catch (error) {
      logger.error('[MediaMonitoring] Alert triggering failed', error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 10,
  }
);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapMentionToDb(mention: CreateMentionInput): any {
  return {
    source_url: mention.sourceUrl,
    title: mention.title,
    excerpt: mention.excerpt || null,
    published_at: mention.publishedAt,
    author: mention.author || null,
    outlet: mention.outlet || null,
    outlet_domain: mention.outletDomain || null,
    topics: mention.topics || [],
    mention_type: mention.mentionType,
    medium: mention.medium,
    organization_id: mention.organizationId,
  };
}

// =====================================================
// QUEUE MANAGEMENT
// =====================================================

export async function ingestMediaMention(
  mention: CreateMentionInput,
  fullContent?: string
): Promise<void> {
  await mediaMonitoringQueue.add('ingest-mention', {
    mention,
    fullContent,
  });

  logger.info('[MediaMonitoring] Queued mention for ingestion', {
    title: mention.title,
  });
}

export async function checkDuplicates(organizationId: string): Promise<void> {
  await mediaMonitoringQueue.add('check-duplicates', {
    organizationId,
    batchSize: 100,
  });
}

// Worker event listeners
ingestMentionWorker.on('completed', (job) => {
  logger.info('[MediaMonitoring] Job completed', {
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});

ingestMentionWorker.on('failed', (job, error) => {
  logger.error('[MediaMonitoring] Job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

triggerAlertsWorker.on('completed', (job) => {
  logger.info('[MediaMonitoring] Alerts job completed', {
    jobId: job.id,
    alertsTriggered: job.returnvalue?.alertsTriggered,
  });
});

logger.info('[MediaMonitoring] Queue workers initialized');
