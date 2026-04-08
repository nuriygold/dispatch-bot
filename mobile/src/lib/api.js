import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = {
  baseUrl: '', // set after pairing
};

export async function setBaseUrl(url) {
  api.baseUrl = url.replace(/\/$/, '');
  await AsyncStorage.setItem('dispatch.baseUrl', api.baseUrl);
}

export async function loadBaseUrl() {
  const value = await AsyncStorage.getItem('dispatch.baseUrl');
  if (value) api.baseUrl = value;
  return api.baseUrl;
}

export function getBaseUrl() {
  return api.baseUrl;
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
  get baseUrl() {
    return api.baseUrl;
  },
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
  getProgress: (id) => request(`/campaigns/${id}/progress`),
  pauseCampaign: (id) => request(`/campaigns/${id}/pause`, { method: 'POST' }),
  resumeCampaign: (id) => request(`/campaigns/${id}/resume`, { method: 'POST' }),
  cancelTask: (id) => request(`/tasks/${id}/cancel`, { method: 'POST' }),
  queryMemory: (id, q) => request(`/campaigns/${id}/memory?q=${encodeURIComponent(q)}`),
};
