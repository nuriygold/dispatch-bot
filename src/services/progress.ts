import { pool } from '../db';

export async function getCampaignProgress(campaignId: string) {
  const tasks = await pool.query(
    `SELECT t.id, t.title, t.status, tr.output, tr.created_at
     FROM tasks t
     LEFT JOIN LATERAL (
       SELECT output, created_at FROM task_results WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1
     ) tr ON true
     WHERE t.campaign_id = $1
     ORDER BY t.created_at DESC`,
    [campaignId],
  );

  // Step history (last 10 progress events per task)
  const stepsRes = await pool.query(
    `SELECT task_id, step, tool, status, snippet, ts
     FROM (
       SELECT task_id, step, tool, status, snippet, ts,
              ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY ts DESC) rn
       FROM task_progress
       WHERE campaign_id = $1
     ) x
     WHERE rn <= 10`,
    [campaignId],
  );
  const stepMap: Record<string, any[]> = {};
  for (const row of stepsRes.rows) {
    stepMap[row.task_id] = stepMap[row.task_id] || [];
    stepMap[row.task_id].push(row);
  }

  const spendRes = await pool.query(
    `SELECT COALESCE(SUM(cost_cents),0) as spend_cents FROM task_results tr
     JOIN tasks t ON tr.task_id = t.id WHERE t.campaign_id=$1`,
    [campaignId],
  );
  const budgetRes = await pool.query('SELECT cost_budget_cents, time_budget_seconds FROM campaigns WHERE id=$1', [
    campaignId,
  ]);

  return {
    tasks: tasks.rows,
    spend_cents: Number(spendRes.rows[0]?.spend_cents || 0),
    cost_budget_cents: budgetRes.rows[0]?.cost_budget_cents || null,
    time_budget_seconds: budgetRes.rows[0]?.time_budget_seconds || null,
    steps: stepMap,
  };
}
