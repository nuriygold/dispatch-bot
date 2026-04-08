import { Job } from 'bullmq';
import { createTaskWorker, TaskPayload } from '../queue';
import { getCampaignQueue } from '../queueMap';
import { Worker, Queue } from 'bullmq';
import { redis } from '../redis';
import { pool } from '../db';
import { updateTaskStatus, enqueueReadyTasks } from './tasks';
import { logger } from '../logger';
import { chatCompletion } from './modelRouter';
import { fetchLatestPlan } from './planner';
import { pool } from '../db';
import { v4 as uuid } from 'uuid';
import { availableTools } from './toolRegistry';
import { runToolProcess } from './toolProcess';
import { computeCostCents } from './cost';
import { getCampaignBudget, isCampaignPaused } from './campaigns';
import { config } from '../config';
import { emitTaskCompleted, emitTaskStarted, emitTaskProgress } from './events';
import { getTask } from './tasks';
import { emitTaskProgress } from './events';

export async function enqueueExecution(payload: TaskPayload) {
  const cq = getCampaignQueue(payload.campaignId);
  const paused = await isCampaignPaused(payload.campaignId);
  if (paused) {
    await cq.add('execute', payload, {
      delay: 5000,
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: false,
      jobId: `${payload.campaignId}:${payload.taskId}`,
    });
    return;
  }
  await cq.add('execute', payload, { attempts: 2, removeOnComplete: true, removeOnFail: false, jobId: `${payload.campaignId}:${payload.taskId}` });
}

export function startExecutionWorkers() {
  // Default queue worker (legacy)
  createTaskWorker(async (job: Job<TaskPayload>) => {
    const { taskId, campaignId, title } = job.data;
    const budgetOk = await getCampaignBudget(campaignId);
    if (budgetOk?.blocked) {
      logger.warn({ campaignId }, 'budget exceeded; skipping task');
      await updateTaskStatus(taskId, 'failed');
      return;
    }
    if (await isCampaignPaused(campaignId)) {
      await enqueueExecution({ taskId, campaignId, title });
      return;
    }
    const current = await getTask(taskId);
    if (current?.status === 'cancelled') {
      logger.warn({ taskId }, 'task already cancelled');
      return;
    }
    await updateTaskStatus(taskId, 'running');
    emitTaskStarted({ campaignId, taskId, title });

    // Load latest approved plan for dependency context (future: respect DAG)
    const plan = await fetchLatestPlan(campaignId);

    const systemPrompt = `You are an execution agent. Use tools when useful and keep responses concise. Tool availability may change based on environment.`;
    const userPrompt = `Task: ${title}. Plan context: ${JSON.stringify(plan?.content || {})}`;

    const tools = availableTools({
      hasInternet: !config.offlineMode,
      hasBrowser: true,
      hasApifyToken: !!process.env.APIFY_TOKEN,
      allowlist: config.toolAllowlist,
      denylist: config.toolDenylist,
    });
    const messages: any[] = [
      { role: 'system', content: `${systemPrompt} Available tools: ${tools.map((t) => t.name).join(', ')}` },
      { role: 'user', content: userPrompt },
    ];

    let finalText = '';
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
    const start = Date.now();
    for (let step = 0; step < 6; step++) {
      const latest = await getTask(taskId);
      if (latest?.status === 'cancelled') {
        finalText = 'cancelled';
        break;
      }
      if (await isCampaignPaused(campaignId)) {
        await enqueueExecution({ taskId, campaignId, title });
        return;
      }
      const ai = await chatCompletion('execution', messages, tools);
      totalUsage.prompt_tokens += ai?.usage?.prompt_tokens || 0;
      totalUsage.completion_tokens += ai?.usage?.completion_tokens || 0;
      const msg = ai?.choices?.[0]?.message;
      if (!msg) break;
      if (msg.tool_calls && msg.tool_calls.length) {
        for (const call of msg.tool_calls) {
          try {
            emitTaskProgress({
              campaignId,
              taskId,
              step,
              tool: call.function.name,
              status: 'running',
            });
            const result = runToolProcess(call.function.name, call.function.arguments);
            messages.push({ role: 'tool', tool_call_id: call.id, content: result });
            await pool.query(
              `INSERT INTO task_progress (id, campaign_id, task_id, step, tool, status, snippet, ts)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [uuid(), campaignId, taskId, step, call.function.name, 'done', String(result).slice(0, 400), Date.now()],
            );
            emitTaskProgress({
              campaignId,
              taskId,
              step,
              tool: call.function.name,
              status: 'done',
              snippet: String(result).slice(0, 400),
            });
          } catch (err) {
            messages.push({ role: 'tool', tool_call_id: call.id, content: `error: ${(err as Error).message}` });
            await pool.query(
              `INSERT INTO task_progress (id, campaign_id, task_id, step, tool, status, snippet, ts)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [uuid(), campaignId, taskId, step, call.function.name, 'error', (err as Error).message, Date.now()],
            );
            emitTaskProgress({
              campaignId,
              taskId,
              step,
              tool: call.function.name,
              status: 'error',
              snippet: (err as Error).message,
            });
          }
        }
        continue;
      }
      if (msg.content) {
        finalText = msg.content;
        break;
      }
    }

    const durationMs = Date.now() - start;
    const costCents = computeCostCents(totalUsage);

    await pool.query(
      `INSERT INTO task_results (id, task_id, success, output, tokens_input, tokens_output, cost_cents, duration_ms)
       VALUES ($1,$2,true,$3,$4,$5,$6,$7)`,
      [
        uuid(),
        taskId,
        finalText || 'done',
        totalUsage.prompt_tokens || 0,
        totalUsage.completion_tokens || 0,
        costCents,
        durationMs,
      ],
    );

    await updateTaskStatus(taskId, 'done');
    emitTaskCompleted({ campaignId, taskId, title, success: true, output: finalText });
    await enqueueReadyTasks(campaignId, async (readyId, readyTitle, readyDesc) => {
      await enqueueExecution({ taskId: readyId, campaignId, title: readyTitle, description: readyDesc });
    });
    logger.info({ taskId }, 'task completed');
  });

  // Campaign-specific workers (created on startup and refreshed)
  const campaignWorkers = new Map<string, Worker>();
  async function ensureCampaignWorkers() {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM campaigns');
    for (const row of rows) {
      const qname = `tasks:${row.id}`;
      if (campaignWorkers.has(qname)) continue;
      const worker = new Worker<TaskPayload>(
        qname,
        async (job: Job<TaskPayload>) => {
          await enqueueExecution(job.data);
        },
        { connection: redis, concurrency: 3 },
      );
      worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'campaign worker failed'));
      campaignWorkers.set(qname, worker);
    }
  }
  ensureCampaignWorkers().catch((err) => logger.error({ err }, 'ensure workers failed'));
  setInterval(() => ensureCampaignWorkers().catch(() => {}), 30000);
}

// Future: add DAG-aware scheduler, budget enforcement, tool execution handlers.
