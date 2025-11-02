import dotenv from 'dotenv';
import { logger } from './lib/logger';
import { startWorker } from './worker';

dotenv.config();

async function main() {
  logger.info('Starting Pravado Agent Execution Engine');

  if (!process.env.ENABLE_AGENT_EXECUTION || process.env.ENABLE_AGENT_EXECUTION !== 'true') {
    logger.warn('Agent execution is disabled. Set ENABLE_AGENT_EXECUTION=true to enable.');
    return;
  }

  const workers = startWorker();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing workers');
    await workers.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing workers');
    await workers.close();
    process.exit(0);
  });

  logger.info('Agent workers started successfully');
}

main().catch((error) => {
  logger.error('Failed to start agent worker', error);
  process.exit(1);
});
