import { config } from './config';
import { logger } from './logger';
import { startExecutionWorkers } from './services/executor';
import { startNightlyCron } from './cron/nightly';
import { createServer } from './server';

startExecutionWorkers();
startNightlyCron();

const { server } = createServer();

server.listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});
