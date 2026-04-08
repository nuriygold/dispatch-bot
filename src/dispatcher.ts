import { Worker, Job } from 'bullmq';
import { redis } from './redis';
import { TaskPayload } from './queue';
import { startExecutionWorkers } from './services/executor';
import { logger } from './logger';

// Dispatcher consumes the default queue and re-adds to campaign-specific queues to avoid cross-campaign blocking.

export function startDispatcher() {
  const worker = new Worker<TaskPayload>(
    'tasks',
    async (job: Job<TaskPayload>) => {
      // Execution workers already listen on campaign queues; enqueue and done.
      const { enqueueExecution } = require('./services/executor');
      await enqueueExecution(job.data);
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'dispatcher failed'));
}
