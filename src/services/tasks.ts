import { pool } from '../db';
import { v4 as uuid } from 'uuid';
import { Task } from '../types/models';

export async function createTask(input: {
  campaign_id: string;
  title: string;
  description?: string;
  priority?: number;
  dependencies?: string[];
  tool_requirements?: string[];
  status?: Task['status'];
}): Promise<Task> {
  const id = uuid();
  const { rows } = await pool.query<Task>(
    `INSERT INTO tasks (id, campaign_id, title, description, priority, dependencies, tool_requirements, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      id,
      input.campaign_id,
      input.title,
      input.description || null,
      input.priority || 5,
      input.dependencies || [],
      input.tool_requirements || [],
      input.status || 'queued',
    ],
  );
  return rows[0];
}

export async function updateTaskStatus(taskId: string, status: Task['status']) {
  await pool.query('UPDATE tasks SET status = $2, updated_at = NOW() WHERE id = $1', [taskId, status]);
}

export async function cancelTask(taskId: string) {
  await pool.query('UPDATE tasks SET status = $2, updated_at = NOW() WHERE id = $1', [taskId, 'cancelled']);
}

export async function getTask(id: string): Promise<Task | null> {
  const { rows } = await pool.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listTasksForCampaign(campaignId: string): Promise<Task[]> {
  const { rows } = await pool.query<Task>('SELECT * FROM tasks WHERE campaign_id = $1 ORDER BY created_at DESC', [campaignId]);
  return rows;
}

export async function enqueueReadyTasks(campaignId: string, enqueue: (taskId: string, title: string, description?: string) => Promise<void>) {
  const pausedRes = await pool.query('SELECT status FROM campaigns WHERE id = $1', [campaignId]);
  if ((pausedRes.rows[0]?.status || '') === 'paused') return;
  const { rows } = await pool.query<{ id: string; title: string; description?: string }>(
    `SELECT t.id, t.title, t.description
     FROM tasks t
     WHERE t.campaign_id = $1
       AND t.status = 'planned'
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(t.dependencies, '{}')) dep
         JOIN tasks deps ON deps.id = dep
         WHERE deps.status <> 'done'
       )`,
    [campaignId],
  );

  for (const row of rows) {
    await updateTaskStatus(row.id, 'queued');
    await enqueue(row.id, row.title, row.description);
  }
}
