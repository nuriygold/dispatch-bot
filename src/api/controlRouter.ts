import express from 'express';
import { pool } from '../db';
import { cancelTask, enqueueReadyTasks } from '../services/tasks';
import { emitCampaignPaused, emitCampaignResumed, emitTaskCancelled } from '../services/events';
import { getCampaignQueue } from '../queueMap';
import { getCampaignProgress } from '../services/progress';
import { enqueueExecution } from '../services/executor';
import { requireApiToken } from '../middleware/auth';

export const controlRouter = express.Router();
controlRouter.use(requireApiToken);

controlRouter.post('/campaigns/:id/pause', async (req, res, next) => {
  try {
    await pool.query(`UPDATE campaigns SET status='paused' WHERE id=$1`, [req.params.id]);
    await getCampaignQueue(req.params.id).pause();
    emitCampaignPaused(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

controlRouter.post('/campaigns/:id/resume', async (req, res, next) => {
  try {
    await pool.query(`UPDATE campaigns SET status='executing' WHERE id=$1`, [req.params.id]);
    await getCampaignQueue(req.params.id).resume();
    await enqueueReadyTasks(req.params.id, async (taskId, title, description) => {
      await enqueueExecution({ taskId, campaignId: req.params.id, title, description });
    });
    emitCampaignResumed(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

controlRouter.post('/tasks/:id/cancel', async (req, res, next) => {
  try {
    await cancelTask(req.params.id);
    // fetch campaign for event
    const { rows } = await pool.query('SELECT campaign_id FROM tasks WHERE id=$1', [req.params.id]);
    if (rows[0]) {
      const campaignId = rows[0].campaign_id;
      const queue = getCampaignQueue(campaignId);
      const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized']);
      await Promise.all(
        jobs
          .filter((job) => job.data?.taskId === req.params.id)
          .map((job) => job.remove().catch(() => undefined)),
      );
      emitTaskCancelled(campaignId, req.params.id);
    }
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
