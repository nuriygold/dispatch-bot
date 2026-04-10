import { Job, Worker } from 'bullmq';
import { TaskPayload } from '../queue';
import { getCampaignQueue } from '../queueMap';
import { redis } from '../redis';
import { pool } from '../db';
import { updateTaskStatus, enqueueReadyTasks } from './tasks';
import { logger } from '../logger';
import { chatCompletion } from './modelRouter';
import { fetchLatestPlan } from './planner';
import { v4 as uuid } from 'uuid';
import { availableTools } from './toolRegistry';
import { runToolProcess } from './toolProcess';
import { computeCostCents } from './cost';
import { getCampaignBudget, isCampaignPaused } from './campaigns';
import { config } from '../config';
import { emitTaskCompleted, emitTaskStarted, emitTaskProgress } from './events';
import { getTask } from './tasks';
import { recordTaskSummary } from './memory';

const campaignWorkers = new Map<string, Worker>();

function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

function toOpenAITools(tools: ReturnType<typeof availableTools>) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

function messageContentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text: unknown }).text);
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

async function ensureCampaignWorker(campaignId: string) {
  const qname = `tasks:${campaignId}`;
  if (campaignWorkers.has(qname)) return campaignWorkers.get(qname)!;

  const worker = new Worker<TaskPayload>(
    qname,
    async (job: Job<TaskPayload>) => {
      await executeTask(job.data);
    },
    { connection: redis, concurrency: 3 },
  );
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'campaign worker failed'));
  campaignWorkers.set(qname, worker);
  return worker;
}

export async function enqueueExecution(payload: TaskPayload, delay = 0) {
  await ensureCampaignWorker(payload.campaignId);
  const cq = getCampaignQueue(payload.campaignId);
  await cq.add('execute', payload, {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: false,
    delay,
    jobId: delay ? `${payload.campaignId}:${payload.taskId}:delayed` : `${payload.campaignId}:${payload.taskId}`,
  });
}

export async function executeTask(payload: TaskPayload) {
  const { taskId, campaignId, title, description } = payload;
  try {
    const current = await getTask(taskId);
    if (!current || current.status === 'done' || current.status === 'cancelled' || current.status === 'running') {
      logger.debug({ taskId, status: current?.status }, 'skipping task execution');
      return;
    }

    const budgetOk = await getCampaignBudget(campaignId);
    if (budgetOk?.blocked) {
      logger.warn({ campaignId }, 'budget exceeded; skipping task');
      await updateTaskStatus(taskId, 'failed');
      return;
    }
    if (await isCampaignPaused(campaignId)) {
      await updateTaskStatus(taskId, 'queued');
      await enqueueExecution(payload, config.executionRequeueDelayMs);
      return;
    }
    await updateTaskStatus(taskId, 'running');
    emitTaskStarted({ campaignId, taskId, title });

    const plan = await fetchLatestPlan(campaignId);

    const systemPrompt = `You are an execution agent. Use tools when useful and keep responses concise. Tool availability may change based on environment.`;
    const userPrompt = `Task: ${title}\nDescription: ${description || ''}\nPlan context: ${JSON.stringify(plan?.content || {})}`;

    const tools = availableTools({
      hasInternet: !config.offlineMode,
      hasBrowser: true,
      hasApifyToken: !!process.env.APIFY_TOKEN,
      allowlist: config.toolAllowlist,
      denylist: config.toolDenylist,
    });
    const openAITools = toOpenAITools(tools);
    const messages: any[] = [
      { role: 'system', content: `${systemPrompt} Available tools: ${tools.map((t) => t.name).join(', ')}` },
      { role: 'user', content: userPrompt },
    ];

    let finalText = '';
    const totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
    const start = Date.now();
    for (let step = 0; step < 6; step++) {
      const latest = await getTask(taskId);
      if (latest?.status === 'cancelled') {
        finalText = 'cancelled';
        break;
      }
      if (await isCampaignPaused(campaignId)) {
        await updateTaskStatus(taskId, 'queued');
        await enqueueExecution(payload, config.executionRequeueDelayMs);
        return;
      }
      const ai = await chatCompletion('execution', messages, openAITools);
      totalUsage.prompt_tokens += ai?.usage?.prompt_tokens || 0;
      totalUsage.completion_tokens += ai?.usage?.completion_tokens || 0;
      const msg = ai?.choices?.[0]?.message;
      if (!msg) break;
      if (msg.tool_calls && msg.tool_calls.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          try {
            emitTaskProgress({
              campaignId,
              taskId,
              step,
              tool: call.function.name,
              status: 'running',
            });
            const result = runToolProcess(call.function.name, parseToolArguments(call.function.arguments));
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
        finalText = messageContentToText(msg.content);
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
    if (finalText) {
      await recordTaskSummary(taskId, finalText, 'summary');
    }
    logger.info(
      {
        taskId,
        campaignId,
        durationMs,
        costCents,
        promptTokens: totalUsage.prompt_tokens || 0,
        completionTokens: totalUsage.completion_tokens || 0,
      },
      'task completed',
    );
    emitTaskCompleted({ campaignId, taskId, title, success: true, output: finalText });
    await enqueueReadyTasks(campaignId, async (readyId, readyTitle, readyDesc) => {
      await enqueueExecution({ taskId: readyId, campaignId, title: readyTitle, description: readyDesc });
    });
  } catch (err) {
    await pool.query(
      `INSERT INTO task_results (id, task_id, success, output, error_message, tokens_input, tokens_output, cost_cents, duration_ms)
       VALUES ($1,$2,false,$3,$4,$5,$6,$7,$8)`,
      [uuid(), taskId, null, (err as Error).message, 0, 0, 0, 0],
    );
    await updateTaskStatus(taskId, 'failed');
    logger.error({ taskId, err }, 'task execution failed');
    emitTaskCompleted({ campaignId, taskId, title, success: false, output: (err as Error).message });
    throw err;
  }
}

export function startExecutionWorkers() {
  async function ensureExistingCampaignWorkers() {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM campaigns');
    for (const row of rows) {
      await ensureCampaignWorker(row.id);
    }
  }
  ensureExistingCampaignWorkers().catch((err) => logger.error({ err }, 'ensure workers failed'));
  setInterval(() => ensureExistingCampaignWorkers().catch(() => {}), 30000);
}
