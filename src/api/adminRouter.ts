import express from 'express';
import { redis } from '../redis';
import { pool } from '../db';
import { getCampaignQueue } from '../queueMap';

export const adminRouter = express.Router();

adminRouter.get('/admin/queue', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: string; title: string }>('SELECT id, title FROM campaigns ORDER BY created_at DESC');
    const campaigns = await Promise.all(
      rows.map(async (campaign) => ({
        campaign,
        counts: await getCampaignQueue(campaign.id).getJobCounts('wait', 'active', 'completed', 'failed', 'delayed'),
      })),
    );
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/admin/spend/:campaignId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(cost_cents),0) as spend_cents FROM task_results tr
       JOIN tasks t ON tr.task_id = t.id WHERE t.campaign_id=$1`,
      [req.params.campaignId],
    );
    res.json({ spend_cents: Number(rows[0]?.spend_cents || 0) });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/admin/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
