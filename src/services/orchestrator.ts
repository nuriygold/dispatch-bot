import { Job } from 'bullmq';
import { taskQueue, createTaskWorker, TaskPayload } from '../queue';
import { updateTaskStatus } from './tasks';
import { logger } from '../logger';
import { chatCompletion } from './modelRouter';
import { pool } from '../db';
import { v4 as uuid } from 'uuid';

export async function enqueueTask(payload: TaskPayload) {
  await taskQueue.add('execute', payload, { attempts: 2, removeOnComplete: true, removeOnFail: false });
}

export function startWorkers() {
  createTaskWorker(async (job: Job<TaskPayload>) => {
    const { taskId, title } = job.data;
    await updateTaskStatus(taskId, 'running');

    // Minimal placeholder execution: ask model for a simple plan summary.
    const ai = await chatCompletion('execution', [
      { role: 'system', content: 'You are an execution agent. Briefly acknowledge the task.' },
      { role: 'user', content: title },
    ]);

    const output = ai?.choices?.[0]?.message?.content ?? 'done';

    await pool.query(
      `INSERT INTO task_results (id, task_id, success, output, tokens_input, tokens_output, cost_cents, duration_ms)
       VALUES ($1,$2,true,$3,$4,$5,$6,$7)`,
      [uuid(), taskId, output, 0, 0, 0, 0],
    );

    await updateTaskStatus(taskId, 'done');
    logger.info({ taskId }, 'task completed');
  });
}
