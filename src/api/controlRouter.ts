import express from 'express';
import { pool } from '../db';
import { cancelTask } from '../services/tasks';
import { taskQueue } from '../queue';
import { emitCampaignPaused, emitCampaignResumed, emitTaskCancelled } from '../services/events';
import { getCampaignQueue } from '../queueMap';
import { getCampaignProgress } from '../services/progress';

export const controlRouter = express.Router();

controlRouter.post('/campaigns/:id/pause', async (req, res, next) => {
  try {
    await pool.query(`UPDATE campaigns SET status='paused' WHERE id=$1`, [req.params.id]);
    emitCampaignPaused(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

controlRouter.post('/campaigns/:id/resume', async (req, res, next) => {
  try {
    await pool.query(`UPDATE campaigns SET status='executing' WHERE id=$1`, [req.params.id]);
    emitCampaignResumed(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

controlRouter.post('/tasks/:id/cancel', async (req, res, next) => {
  try {
    await cancelTask(req.params.id);
    const job = await taskQueue.getJob(req.params.id);
    if (job) await job.discard();
    // fetch campaign for event
    const { rows } = await pool.query('SELECT campaign_id FROM tasks WHERE id=$1', [req.params.id]);
    if (rows[0]) emitTaskCancelled(rows[0].campaign_id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

controlRouter.get('/campaigns/:id/progress', async (req, res, next) => {
  try {
    const data = await getCampaignProgress(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
