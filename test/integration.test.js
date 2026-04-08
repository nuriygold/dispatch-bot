process.env.PORT = process.env.PORT || '3000';
process.env.WEB_SOCKET_PATH = process.env.WEB_SOCKET_PATH || '/ws';
process.env.POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://dispatch:dispatch@127.0.0.1:5432/dispatch_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
process.env.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://example.openai.azure.com';
process.env.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || 'test-key';
process.env.AZURE_DEPLOYMENT_GPT4O = process.env.AZURE_DEPLOYMENT_GPT4O || 'gpt-4o';
process.env.AZURE_DEPLOYMENT_GPT4T = process.env.AZURE_DEPLOYMENT_GPT4T || 'gpt-4.1';
process.env.AZURE_DEPLOYMENT_GPT35 = process.env.AZURE_DEPLOYMENT_GPT35 || 'gpt-35-turbo';
process.env.AZURE_DEPLOYMENT_EMBEDDINGS = process.env.AZURE_DEPLOYMENT_EMBEDDINGS || 'text-embedding-3-small';
process.env.CALLBACK_SECRET = process.env.CALLBACK_SECRET || 'callback-secret';
process.env.DISPATCH_API_TOKEN = process.env.DISPATCH_API_TOKEN || 'test-token';
process.env.DISPATCH_ADMIN_TOKEN = process.env.DISPATCH_ADMIN_TOKEN || 'admin-token';

const test = require('node:test');
const assert = require('node:assert/strict');

const { router } = require('../src/api/router');
const { requireApiToken } = require('../src/middleware/auth');
const campaigns = require('../src/services/campaigns');
const planner = require('../src/services/planner');
const tasks = require('../src/services/tasks');
const executor = require('../src/services/executor');
const taskExecutor = require('../src/services/executor');
const modelRouter = require('../src/services/modelRouter');
const toolProcess = require('../src/services/toolProcess');
const toolRegistry = require('../src/services/toolRegistry');
const campaignService = require('../src/services/campaigns');
const memory = require('../src/services/memory');
const events = require('../src/services/events');
const { pool } = require('../src/db');

function makeReq(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    path: '/',
    method: 'GET',
    header(name) {
      const key = Object.keys(this.headers).find((entry) => entry.toLowerCase() === name.toLowerCase());
      return key ? this.headers[key] : undefined;
    },
    ...overrides,
  };
}

function makeRes() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

function getRouteHandler(path, method) {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);
  if (!layer) {
    throw new Error(`Route not found for ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

async function runHandler(handler, req, res) {
  await new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, (err) => (err ? reject(err) : resolve()))).then(resolve, reject);
  });
}

test.afterEach(() => {
  test.mock.restoreAll();
});

test('campaign creation requires token and returns created campaign', async () => {
  const createCampaignHandler = getRouteHandler('/campaigns', 'post');
  test.mock.method(campaigns, 'createCampaign', async (input) => ({
    id: 'campaign-1',
    title: input.title,
    description: input.description || null,
    status: 'planning',
    callback_secret: input.callback_secret,
  }));

  const unauthorizedReq = makeReq({ method: 'POST', path: '/campaigns', body: { title: 'Unauthorized' } });
  const unauthorizedRes = makeRes();
  requireApiToken(unauthorizedReq, unauthorizedRes, () => {});
  assert.equal(unauthorizedRes.statusCode, 401);

  const req = makeReq({
    method: 'POST',
    path: '/campaigns',
    headers: { authorization: `Bearer ${process.env.DISPATCH_API_TOKEN}` },
    body: { title: 'Launch campaign' },
  });
  const res = makeRes();

  await runHandler(createCampaignHandler, req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.id, 'campaign-1');
  assert.equal(res.payload.title, 'Launch campaign');
});

test('plan approval route triggers approval and enqueues ready tasks', async () => {
  const approvePlanHandler = getRouteHandler('/campaigns/:id/plan/approve', 'post');
  const enqueued = [];
  test.mock.method(planner, 'approvePlan', async () => {});
  test.mock.method(tasks, 'enqueueReadyTasks', async (_campaignId, enqueue) => {
    await enqueue('task-1', 'First task', 'Do the first thing');
  });
  test.mock.method(executor, 'enqueueExecution', async (payload) => {
    enqueued.push(payload);
  });

  const req = makeReq({
    method: 'POST',
    path: '/campaigns/campaign-1/plan/approve',
    params: { id: 'campaign-1' },
    headers: { 'x-dispatch-token': process.env.DISPATCH_API_TOKEN },
    body: { planName: 'Plan A' },
  });
  const res = makeRes();

  requireApiToken(req, res, () => {});
  await runHandler(approvePlanHandler, req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(enqueued, [
    {
      taskId: 'task-1',
      campaignId: 'campaign-1',
      title: 'First task',
      description: 'Do the first thing',
    },
  ]);
});

test('dependency scheduling only queues tasks that are ready to run', async () => {
  const updates = [];
  const enqueued = [];

  test.mock.method(pool, 'query', async (sql, params) => {
    if (sql.includes('SELECT status FROM campaigns')) {
      return { rows: [{ status: 'executing' }] };
    }
    if (sql.includes("FROM tasks t") && sql.includes("t.status = 'planned'")) {
      return { rows: [{ id: 'task-ready', title: 'Ready task', description: 'No blockers left' }] };
    }
    if (sql.includes('UPDATE tasks')) {
      updates.push({ id: params[0], status: params[1] });
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  });

  await tasks.enqueueReadyTasks('campaign-2', async (taskId, title, description) => {
    enqueued.push({ taskId, title, description });
  });

  assert.deepEqual(updates, [{ id: 'task-ready', status: 'queued' }]);
  assert.deepEqual(enqueued, [{ taskId: 'task-ready', title: 'Ready task', description: 'No blockers left' }]);
});

test('task execution completes tool-driven work and records the result', async () => {
  const statuses = [];
  const recordedQueries = [];

  test.mock.method(tasks, 'getTask', async () => ({
    id: 'task-9',
    campaign_id: 'campaign-9',
    title: 'Use tool',
    status: 'queued',
  }));
  test.mock.method(tasks, 'updateTaskStatus', async (_taskId, status) => {
    statuses.push(status);
  });
  test.mock.method(tasks, 'enqueueReadyTasks', async () => {});
  test.mock.method(campaignService, 'getCampaignBudget', async () => ({ blocked: false, spent: 0 }));
  test.mock.method(campaignService, 'isCampaignPaused', async () => false);
  test.mock.method(planner, 'fetchLatestPlan', async () => ({ content: [] }));
  test.mock.method(toolRegistry, 'availableTools', () => [
    {
      name: 'fs_list',
      description: 'List files',
      input_schema: { type: 'object', properties: { path: { type: 'string' } } },
      capabilities: {},
    },
  ]);

  let completionCount = 0;
  test.mock.method(modelRouter, 'chatCompletion', async () => {
    completionCount += 1;
    if (completionCount === 1) {
      return {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call-1',
                  function: {
                    name: 'fs_list',
                    arguments: JSON.stringify({ path: '.' }),
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      };
    }
    return {
      choices: [{ message: { content: 'Tool run complete' } }],
      usage: { prompt_tokens: 4, completion_tokens: 3 },
    };
  });
  test.mock.method(toolProcess, 'runToolProcess', () => '["README.md"]');
  test.mock.method(memory, 'recordTaskSummary', async () => {});
  test.mock.method(events, 'emitTaskStarted', () => {});
  test.mock.method(events, 'emitTaskCompleted', () => {});
  test.mock.method(events, 'emitTaskProgress', () => {});
  test.mock.method(pool, 'query', async (sql, params) => {
    recordedQueries.push({ sql, params });
    return { rows: [] };
  });

  await taskExecutor.executeTask({
    taskId: 'task-9',
    campaignId: 'campaign-9',
    title: 'Use tool',
    description: 'Inspect the workspace',
  });

  assert.deepEqual(statuses, ['running', 'done']);
  assert.ok(recordedQueries.some(({ sql }) => sql.includes('INSERT INTO task_progress')));
  assert.ok(recordedQueries.some(({ sql, params }) => sql.includes('INSERT INTO task_results') && params[2] === 'Tool run complete'));
});
