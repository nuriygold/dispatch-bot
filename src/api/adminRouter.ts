import express from 'express';
import { redis } from '../redis';
import { pool } from '../db';
import { getCampaignQueue } from '../queueMap';
import { requireAdminToken } from '../middleware/auth';
import { config } from '../config';

export const adminRouter = express.Router();

adminRouter.get('/admin/queue', requireAdminToken, async (_req, res, next) => {
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

adminRouter.get('/admin/spend/:campaignId', requireAdminToken, async (req, res, next) => {
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

adminRouter.get('/admin/health', requireAdminToken, async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    const [queueRes, executionRes] = await Promise.all([
      pool.query<{
        queued: string;
        running: string;
        failed: string;
        stuck_running: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'queued') AS queued,
           COUNT(*) FILTER (WHERE status = 'running') AS running,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed,
           COUNT(*) FILTER (
             WHERE status = 'running'
               AND started_at IS NOT NULL
               AND EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000 > $1
           ) AS stuck_running
         FROM tasks`,
        [config.queueStuckThresholdMs],
      ),
      pool.query<{ failed_executions_24h: string }>(
        `SELECT COUNT(*) AS failed_executions_24h
         FROM task_results
         WHERE success = false
           AND created_at >= NOW() - INTERVAL '24 hours'`,
      ),
    ]);
    res.json({
      ok: true,
      queue: {
        queued: Number(queueRes.rows[0]?.queued || 0),
        running: Number(queueRes.rows[0]?.running || 0),
        failed: Number(queueRes.rows[0]?.failed || 0),
        stuck_running: Number(queueRes.rows[0]?.stuck_running || 0),
        stuck_threshold_ms: config.queueStuckThresholdMs,
      },
      executions: {
        failed_24h: Number(executionRes.rows[0]?.failed_executions_24h || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});
