import { Platform } from 'react-native';

export const api = {
  baseUrl: '', // set after pairing
};

export function setBaseUrl(url) {
  api.baseUrl = url.replace(/\/$/, '');
}

async function request(path, opts = {}) {
  if (!api.baseUrl) throw new Error('Not paired');
  const res = await fetch(`${api.baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const client = {
  health: () => request('/health'),
  listCampaigns: () => request('/campaigns'),
  createCampaign: (body) => request('/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  getCampaign: (id) => request(`/campaigns/${id}`),
  generatePlan: (id) => request(`/campaigns/${id}/plan`, { method: 'POST', body: '{}' }),
  approvePlan: (id, planName) =>
    request(`/campaigns/${id}/plan/approve`, { method: 'POST', body: JSON.stringify({ planName }) }),
  createTask: (id, body) =>
    request(`/campaigns/${id}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  listTasks: (id) => request(`/campaigns/${id}/tasks`),
};
