// =====================================================
// MEDIA OPPORTUNITY SCANNER QUEUE
// Sprint 68 Track B
// =====================================================
// Scheduled scanning for media opportunities

import { Queue, Worker, Job } from 'bullmq';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { mediaOpportunityAgent } from '../agents/pr/media-opportunity.agent';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// =====================================================
// QUEUE DEFINITION
// =====================================================

export const mediaOpportunityScannerQueue = new Queue('media-opportunity-scanner', {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 50, // Keep last 50 completed jobs
    },
    removeOnFail: {
      count: 25, // Keep last 25 failed jobs
    },
  },
});

// =====================================================
// JOB TYPES
// =====================================================

interface ScanAllOrganizationsJob {
  minScore?: number;
}

interface ScanOrganizationJob {
  organizationId: string;
  focusKeywords?: string[];
  minScore?: number;
}

// =====================================================
// WORKERS
// =====================================================

/**
 * Worker: Scan all active organizations for media opportunities
 */
const scanAllOrganizationsWorker = new Worker<ScanAllOrganizationsJob>(
  'media-opportunity-scanner',
  async (job: Job<ScanAllOrganizationsJob>) => {
    logger.info('[MediaOpportunityScanner] Starting scan for all organizations', {
      jobId: job.id,
    });

    try {
      // Get all active organizations
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('id, name')
        .is('deleted_at', null);

      if (error) {
        logger.error('[MediaOpportunityScanner] Failed to fetch organizations', error);
        throw error;
      }

      if (!organizations || organizations.length === 0) {
        logger.info('[MediaOpportunityScanner] No organizations found');
        return { scannedOrganizations: 0, totalOpportunities: 0 };
      }

      logger.info(`[MediaOpportunityScanner] Found ${organizations.length} organizations to scan`);

      let totalOpportunities = 0;
      const minScore = job.data.minScore || 50;

      // Scan each organization
      for (const org of organizations) {
        try {
          // Get organization's strategy for focus keywords
          const { data: strategy } = await supabase
            .from('strategies')
            .select('keywords')
            .eq('organization_id', org.id)
            .single();

          const focusKeywords = strategy?.keywords || [];

          // Scan for opportunities
          const result = await mediaOpportunityAgent.scanForOpportunities(
            org.id,
            focusKeywords,
            minScore
          );

          logger.info(`[MediaOpportunityScanner] Scanned org ${org.name}`, {
            organizationId: org.id,
            opportunitiesFound: result.opportunitiesFound,
            scanDuration: result.scanDuration,
          });

          // Save opportunities
          if (result.opportunities.length > 0) {
            await mediaOpportunityAgent.saveOpportunities(result.opportunities);
            totalOpportunities += result.opportunities.length;
          }
        } catch (error) {
          logger.error(`[MediaOpportunityScanner] Failed to scan org ${org.id}`, error);
          // Continue with next org even if one fails
        }
      }

      logger.info('[MediaOpportunityScanner] Scan complete for all organizations', {
        scannedOrganizations: organizations.length,
        totalOpportunities,
      });

      return {
        scannedOrganizations: organizations.length,
        totalOpportunities,
      };
    } catch (error) {
      logger.error('[MediaOpportunityScanner] Scan all organizations failed', error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 1, // Run one at a time to avoid overload
  }
);

/**
 * Worker: Scan a single organization for media opportunities
 */
const scanOrganizationWorker = new Worker<ScanOrganizationJob>(
  'media-opportunity-scanner',
  async (job: Job<ScanOrganizationJob>) => {
    const { organizationId, focusKeywords = [], minScore = 50 } = job.data;

    logger.info('[MediaOpportunityScanner] Starting scan for organization', {
      jobId: job.id,
      organizationId,
    });

    try {
      // Scan for opportunities
      const result = await mediaOpportunityAgent.scanForOpportunities(
        organizationId,
        focusKeywords,
        minScore
      );

      logger.info('[MediaOpportunityScanner] Scan complete', {
        organizationId,
        opportunitiesFound: result.opportunitiesFound,
        scanDuration: result.scanDuration,
      });

      // Save opportunities
      if (result.opportunities.length > 0) {
        await mediaOpportunityAgent.saveOpportunities(result.opportunities);
      }

      return {
        scannedItems: result.scannedItems,
        opportunitiesFound: result.opportunitiesFound,
        scanDuration: result.scanDuration,
      };
    } catch (error) {
      logger.error('[MediaOpportunityScanner] Scan organization failed', error);
      throw error;
    }
  },
  {
    connection: REDIS_CONNECTION,
    concurrency: 5, // Can run multiple org scans in parallel
  }
);

// =====================================================
// QUEUE MANAGEMENT
// =====================================================

/**
 * Initialize recurring scan job (runs every 6 hours)
 */
export async function initializeRecurringScan(minScore: number = 50): Promise<void> {
  // Add repeatable job with cron pattern
  // Run every 6 hours at the start of the hour
  await mediaOpportunityScannerQueue.add(
    'scan-all-organizations',
    { minScore },
    {
      repeat: {
        pattern: '0 */6 * * *', // Cron: Every 6 hours at minute 0
      },
      jobId: 'recurring-media-opportunity-scan', // Prevent duplicates
    }
  );

  logger.info('[MediaOpportunityScanner] Initialized recurring scan (every 6 hours)');
}

/**
 * Trigger manual scan for all organizations
 */
export async function scanAllOrganizations(minScore: number = 50): Promise<void> {
  await mediaOpportunityScannerQueue.add('scan-all-organizations', { minScore });
  logger.info('[MediaOpportunityScanner] Queued scan for all organizations');
}

/**
 * Trigger manual scan for a single organization
 */
export async function scanOrganization(
  organizationId: string,
  focusKeywords?: string[],
  minScore?: number
): Promise<void> {
  await mediaOpportunityScannerQueue.add('scan-organization', {
    organizationId,
    focusKeywords,
    minScore,
  });
  logger.info('[MediaOpportunityScanner] Queued scan for organization', {
    organizationId,
  });
}

/**
 * Start the media opportunity scanner worker
 */
export function startMediaOpportunityScannerWorker() {
  // Initialize recurring scan if feature flag is enabled
  if (process.env.ENABLE_MEDIA_OPPORTUNITY_SCANNER === 'true') {
    initializeRecurringScan()
      .then(() => {
        logger.info('[MediaOpportunityScanner] Recurring scan initialized successfully');
      })
      .catch((error) => {
        logger.error('[MediaOpportunityScanner] Failed to initialize recurring scan', error);
      });
  }

  // Worker event listeners
  scanAllOrganizationsWorker.on('completed', (job) => {
    logger.info('[MediaOpportunityScanner] Scan all organizations completed', {
      jobId: job.id,
      result: job.returnvalue,
    });
  });

  scanAllOrganizationsWorker.on('failed', (job, error) => {
    logger.error('[MediaOpportunityScanner] Scan all organizations failed', {
      jobId: job?.id,
      error: error.message,
    });
  });

  scanOrganizationWorker.on('completed', (job) => {
    logger.info('[MediaOpportunityScanner] Scan organization completed', {
      jobId: job.id,
      result: job.returnvalue,
    });
  });

  scanOrganizationWorker.on('failed', (job, error) => {
    logger.error('[MediaOpportunityScanner] Scan organization failed', {
      jobId: job?.id,
      error: error.message,
    });
  });

  logger.info('[MediaOpportunityScanner] Queue workers initialized');

  return {
    scanAllWorker: scanAllOrganizationsWorker,
    scanOrgWorker: scanOrganizationWorker,
    queue: mediaOpportunityScannerQueue,
    close: async () => {
      await Promise.all([
        scanAllOrganizationsWorker.close(),
        scanOrganizationWorker.close(),
        mediaOpportunityScannerQueue.close(),
      ]);
    },
  };
}
