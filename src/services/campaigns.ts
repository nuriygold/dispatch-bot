import { pool } from '../db';
import { v4 as uuid } from 'uuid';
import { Campaign } from '../types/models';

export async function createCampaign(input: {
  title: string;
  description?: string;
  cost_budget_cents?: number;
  time_budget_seconds?: number;
  callback_url?: string;
  callback_secret: string;
}): Promise<Campaign> {
  const id = uuid();
  const { rows } = await pool.query<Campaign>(
    `INSERT INTO campaigns (id, title, description, cost_budget_cents, time_budget_seconds, callback_url, callback_secret)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      id,
      input.title,
      input.description || null,
      input.cost_budget_cents || null,
      input.time_budget_seconds || null,
      input.callback_url || null,
      input.callback_secret,
    ],
  );
  return rows[0];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { rows } = await pool.query<Campaign>('SELECT * FROM campaigns WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { rows } = await pool.query<Campaign>('SELECT * FROM campaigns ORDER BY created_at DESC');
  return rows;
}

export async function getCampaignBudget(campaignId: string): Promise<{ blocked: boolean; spent: number; budget?: number }> {
  const { rows } = await pool.query<{ cost_budget_cents: number | null }>(
    'SELECT cost_budget_cents FROM campaigns WHERE id = $1',
    [campaignId],
  );
  if (!rows[0]) return { blocked: false, spent: 0 };
  const budget = rows[0].cost_budget_cents || undefined;
  const spendRes = await pool.query<{ sum: number }>(
    'SELECT COALESCE(SUM(cost_cents),0) as sum FROM task_results tr JOIN tasks t ON tr.task_id = t.id WHERE t.campaign_id=$1',
    [campaignId],
  );
  const spent = Number(spendRes.rows[0]?.sum || 0);
  const blocked = budget !== undefined && spent > budget;
  return { blocked, spent, budget };
}

export async function isCampaignPaused(campaignId: string): Promise<boolean> {
  const { rows } = await pool.query<{ status: string }>('SELECT status FROM campaigns WHERE id = $1', [campaignId]);
  return (rows[0]?.status || '') === 'paused';
}
