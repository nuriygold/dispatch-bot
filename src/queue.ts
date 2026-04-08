import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { logger } from './logger';

export type TaskPayload = {
  taskId: string;
  campaignId: string;
  title: string;
  description?: string;
};

export const taskQueue = new Queue<TaskPayload>('tasks', {
  connection: redis,
});

export function createTaskWorker(processFn: (job: Job<TaskPayload>) => Promise<void>) {
  const worker = new Worker<TaskPayload>('tasks', processFn, {
    connection: redis,
    concurrency: 5,
  });

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'task job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'task job failed'));

  return worker;
}
