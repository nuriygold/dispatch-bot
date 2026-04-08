import { v4 as uuid } from 'uuid';
import { pool } from '../db';
import { chatCompletion } from './modelRouter';
import { logger } from '../logger';
import { emitPlanSwitched } from './events';

interface PlanOption {
  name: string; // Plan A/B/C
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    dependencies: string[];
  }>;
  estimated_cost_cents?: number;
  estimated_duration_seconds?: number;
}

export async function generatePlans(campaignId: string, goal: string): Promise<PlanOption[]> {
  const systemPrompt = `You are a planning agent. Given a goal, propose three alternative execution plans (Plan A/B/C). Each plan is a DAG of tasks with dependencies. Keep tasks concise.`;
  const userPrompt = `Goal: ${goal}\nReturn JSON with array plans:[{name, tasks:[{title, description, deps[]}], estimated_cost_cents, estimated_duration_seconds}]`;

  const resp = await chatCompletion('planning', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const text = resp?.choices?.[0]?.message?.content;
  if (!text) throw new Error('planning response empty');

  let parsed: any;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, ''));
  } catch (err) {
    logger.warn({ text }, 'Failed to parse plan JSON, falling back to stub');
    parsed = { plans: [{ name: 'Plan A', tasks: [{ title: goal, deps: [] }] }] };
  }

  const plans: PlanOption[] = (parsed.plans || []).map((p: any, idx: number) => {
    return {
      name: p.name || `Plan ${String.fromCharCode(65 + idx)}`,
      estimated_cost_cents: p.estimated_cost_cents,
      estimated_duration_seconds: p.estimated_duration_seconds,
      tasks: (p.tasks || []).map((t: any) => ({
        id: uuid(),
        title: t.title,
        description: t.description,
        dependencies: t.deps || t.dependencies || [],
      })),
    };
  });

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

  // create tasks from selected plan
  for (const task of selected.tasks || []) {
    await pool.query(
      `INSERT INTO tasks (id, campaign_id, title, description, dependencies, status)
       VALUES ($1,$2,$3,$4,$5,'planned') ON CONFLICT DO NOTHING`,
      [task.id || uuid(), campaignId, task.title, task.description || null, task.dependencies || []],
    );
  }

  emitPlanSwitched(campaignId, selected.name);
}

export async function fetchLatestPlan(campaignId: string) {
  const { rows } = await pool.query('SELECT * FROM plans WHERE campaign_id=$1 ORDER BY created_at DESC LIMIT 1', [campaignId]);
  return rows[0] || null;
}
