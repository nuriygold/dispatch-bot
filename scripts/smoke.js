#!/usr/bin/env node
const WebSocket = require('ws');

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const wsUrl = baseUrl.replace(/^http/, 'ws') + (process.env.WEB_SOCKET_PATH || '/ws');

async function request(path, opts = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function waitForProgress(campaignId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('timed out waiting for campaign_progress over WebSocket'));
    }, timeoutMs);

    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', campaignId }));
    });
    socket.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'campaign_progress' && msg.campaignId === campaignId) {
        clearTimeout(timeout);
        socket.close();
        resolve(msg);
      }
    });
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  const health = await request('/health');
  console.log('health', health.ok);

  const campaign = await request('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: `Smoke test ${new Date().toISOString()}`,
      description: 'End-to-end campaign smoke test from scripts/smoke.js',
      cost_budget_cents: 1000,
    }),
  });
  console.log('campaign', campaign.id);

  const plan = await request(`/campaigns/${campaign.id}/plan`, { method: 'POST', body: '{}' });
  if (!plan.plans?.length) throw new Error('planner returned no plans');
  console.log('plans', plan.plans.map((p) => p.name).join(', '));

  await request(`/campaigns/${campaign.id}/plan/approve`, {
    method: 'POST',
    body: JSON.stringify({ planName: plan.plans[0].name }),
  });
  console.log('approved', plan.plans[0].name);

  const progress = await waitForProgress(campaign.id);
  console.log('ws_progress', progress.tasks?.length || 0);

  const memory = await request(`/campaigns/${campaign.id}/memory?q=${encodeURIComponent(campaign.title)}`);
  console.log('memory_rows', memory.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
