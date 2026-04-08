import cron from 'node-cron';
import { nightlySummaries } from '../services/memory';
import { logger } from '../logger';

export function startNightlyCron() {
  // Run at 2:05am UTC daily
  cron.schedule('5 2 * * *', async () => {
    try {
      await nightlySummaries();
    } catch (err) {
      logger.error({ err }, 'nightly cron failed');
    }
  });
  logger.info('nightly cron scheduled (02:05 UTC)');
}
