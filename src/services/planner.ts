import { v4 as uuid } from 'uuid';
import { pool } from '../db';
import { chatCompletion } from './modelRouter';
import { emitPlanSwitched } from './events';
import { z } from 'zod';

export interface PlanOption {
  name: string; // Plan A/B/C
  tasks: Array<{
    id: string;
    key: string;
    title: string;
    description?: string;
    dependencies: string[];
  }>;
  estimated_cost_cents?: number;
  estimated_duration_seconds?: number;
}

const RawTaskSchema = z.object({
  id: z.string().optional(),
  key: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  deps: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

const RawPlanSchema = z.object({
  name: z.string().min(1).optional(),
  tasks: z.array(RawTaskSchema).min(1),
  estimated_cost_cents: z.number().int().nonnegative().optional(),
  estimated_duration_seconds: z.number().int().nonnegative().optional(),
});

const RawPlansSchema = z.object({ plans: z.array(RawPlanSchema).min(1) });

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1] || text;
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

function normalizePlans(raw: z.infer<typeof RawPlansSchema>): PlanOption[] {
  return raw.plans.map((plan, planIdx) => {
    const keyToId = new Map<string, string>();
    const tasks = plan.tasks.map((task, taskIdx) => {
      const key = task.key || task.id || task.title || `task-${taskIdx + 1}`;
      const id = uuid();
      keyToId.set(key, id);
      return {
        id,
        key,
        title: task.title,
        description: task.description,
        dependencies: task.deps || task.dependencies || [],
      };
    });

    return {
      name: plan.name || `Plan ${String.fromCharCode(65 + planIdx)}`,
      estimated_cost_cents: plan.estimated_cost_cents,
      estimated_duration_seconds: plan.estimated_duration_seconds,
      tasks: tasks.map((task) => ({
        ...task,
        dependencies: task.dependencies
          .map((dep) => keyToId.get(dep))
          .filter((dep): dep is string => Boolean(dep)),
      })),
    };
  });
}

export async function generatePlans(campaignId: string, goal: string): Promise<PlanOption[]> {
  const systemPrompt = `You are a planning agent. Given a goal, propose three alternative execution plans (Plan A/B/C). Each plan is a DAG of tasks with dependencies. Return strict JSON only.`;
  const userPrompt = `Goal: ${goal}
Return JSON with shape:
{"plans":[{"name":"Plan A","tasks":[{"key":"task-1","title":"Short title","description":"Optional detail","deps":["other-task-key"]}],"estimated_cost_cents":0,"estimated_duration_seconds":0}]}
Dependency values must reference task keys in the same plan.`;

  const resp = await chatCompletion('planning', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const text = messageContentToText(resp?.choices?.[0]?.message?.content);
  if (!text) throw new Error('planning response empty');

  let parsed: z.infer<typeof RawPlansSchema>;
  try {
    parsed = RawPlansSchema.parse(JSON.parse(extractJson(String(text))));
  } catch (err) {
    throw new Error(
      `planning response did not match expected JSON schema: ${(err as Error).message}. Raw response: ${String(text).slice(0, 800)}`,
    );
  }

  const plans = normalizePlans(parsed);

  // persist
  const planId = uuid();
  await pool.query(
    `INSERT INTO plans (id, campaign_id, content, status) VALUES ($1,$2,$3,'draft')`,
    [planId, campaignId, JSON.stringify(plans)],
  );

  return plans;
}

export async function approvePlan(campaignId: string, planName?: string): Promise<void> {
  const latest = await fetchLatestPlan(campaignId);
  if (!latest) throw new Error('no plan to approve');
  const content = latest.content as any[];
  const selected = planName ? content.find((p: any) => p.name === planName) : content[0];
  if (!selected) throw new Error('no matching plan');

  // mark plan approved
  await pool.query(`UPDATE plans SET status='approved' WHERE id=$1`, [latest.id]);
  await pool.query(`UPDATE campaigns SET status='executing', updated_at=NOW() WHERE id=$1`, [campaignId]);

  // create tasks from selected plan
  for (const task of selected.tasks || []) {
    await pool.query(
      `INSERT INTO tasks (id, campaign_id, title, description, dependencies, status)
       VALUES ($1,$2,$3,$4,$5,'planned') ON CONFLICT DO NOTHING`,
      [task.id, campaignId, task.title, task.description || null, task.dependencies || []],
    );
  }

  emitPlanSwitched(campaignId, selected.name);
}

export async function fetchLatestPlan(campaignId: string) {
  const { rows } = await pool.query('SELECT * FROM plans WHERE campaign_id=$1 ORDER BY created_at DESC LIMIT 1', [campaignId]);
  return rows[0] || null;
}
