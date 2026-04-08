import express from 'express';
import { createCampaign, getCampaign, listCampaigns } from '../services/campaigns';
import { createTask, listTasksForCampaign, getTask, enqueueReadyTasks } from '../services/tasks';
import { enqueueExecution } from '../services/executor';
import { config } from '../config';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { pool } from '../db';
import { logger } from '../logger';
import { generatePlans, approvePlan } from '../services/planner';
import { queryMemory } from '../services/memory';
import { createCampaignSchema, createTaskSchema, createPlanSchema, memoryQuerySchema } from './schemas';

export const router = express.Router();
router.use(express.json());

router.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

router.post('/campaigns', async (req, res, next) => {
  try {
    const parsed = createCampaignSchema.parse(req.body);
    const campaign = await createCampaign({
      ...parsed,
      callback_secret: config.callbackSecret,
    });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns', async (_req, res, next) => {
  try {
    res.json(await listCampaigns());
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'not_found' });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:id/plan', async (req, res, next) => {
  try {
    createPlanSchema.parse(req.body);
    const campaign = await getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'not_found' });
    const plans = await generatePlans(campaign.id, campaign.title);
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:id/plan/approve', async (req, res, next) => {
  try {
    await approvePlan(req.params.id, req.body?.planName);
    await enqueueReadyTasks(req.params.id, async (taskId, title, description) => {
      await enqueueExecution({ taskId, campaignId: req.params.id, title, description });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:id/tasks', async (req, res, next) => {
  try {
    const parsed = createTaskSchema.parse(req.body);
    const task = await createTask({
      campaign_id: req.params.id,
      ...parsed,
    });
    await enqueueExecution({ taskId: task.id, campaignId: req.params.id, title: task.title, description: task.description });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:id/tasks', async (req, res, next) => {
  try {
    const tasks = await listTasksForCampaign(req.params.id);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:id/memory', async (req, res, next) => {
  try {
    const parsed = memoryQuerySchema.parse(req.query);
    const rows = await queryMemory(req.params.id, parsed.q);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:id', async (req, res, next) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'not_found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post('/callbacks/:campaignId', async (req, res) => {
  // Receive webhook from our system and verify secret for demo.
  const signature = req.headers['x-callback-signature'];
  const { campaignId } = req.params;
  const body = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', config.callbackSecret).update(body).digest('hex');
  if (signature !== expected) return res.status(401).json({ error: 'invalid_signature' });

  await pool.query('INSERT INTO task_results (id, task_id, success, output) VALUES ($1,$2,$3,$4)', [
    uuid(),
    req.body.taskId,
    true,
    JSON.stringify(req.body),
  ]);
  logger.info({ campaignId }, 'callback received');
  res.json({ ok: true });
});

// basic error handler
router.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'API error');
  res.status(500).json({ error: 'internal_error', detail: err.message });
});
