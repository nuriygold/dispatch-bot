import express from 'express';
import { redis } from '../redis';
import { pool } from '../db';
import { getCampaignQueue } from '../queueMap';
import { requireAdminToken } from '../middleware/auth';

export const adminRouter = express.Router();
adminRouter.use(requireAdminToken);

adminRouter.get('/admin/queue', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ id: string; title: string; status: string }>(
      'SELECT id, title, status FROM campaigns ORDER BY created_at DESC',
    );
    const campaigns = await Promise.all(
      rows.map(async (campaign) => ({
        campaign,
        counts: await getCampaignQueue(campaign.id).getJobCounts(
          'wait',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
          'prioritized',
        ),
      })),
    );
    const totals = campaigns.reduce(
      (acc, item) => {
        for (const [key, value] of Object.entries(item.counts || {})) {
          acc[key] = (acc[key] || 0) + Number(value || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );
    res.json({ campaigns, totals });
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
