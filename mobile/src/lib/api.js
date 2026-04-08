import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = {
  baseUrl: '', // set after pairing
  token: '',
};

export async function setConnection(url, token = '') {
  api.baseUrl = url.replace(/\/$/, '');
  api.token = token.trim();
  await AsyncStorage.setItem('dispatch.baseUrl', api.baseUrl);
  await AsyncStorage.setItem('dispatch.token', api.token);
}

export async function loadConnection() {
  const [baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('dispatch.baseUrl'),
    AsyncStorage.getItem('dispatch.token'),
  ]);
  if (baseUrl) api.baseUrl = baseUrl;
  api.token = token || '';
  return { baseUrl: api.baseUrl, token: api.token };
}

export function getBaseUrl() {
  return api.baseUrl;
}

export function getToken() {
  return api.token;
}

function authHeaders(token = api.token) {
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'x-dispatch-token': token,
  };
}

async function request(path, opts = {}, override = {}) {
  const baseUrl = (override.baseUrl || api.baseUrl || '').replace(/\/$/, '');
  const token = override.token ?? api.token;
  if (!baseUrl) throw new Error('Not paired');
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(token), ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const client = {
  get baseUrl() {
    return api.baseUrl;
  },
  get token() {
    return api.token;
  },
  healthAt: (baseUrl, token) => request('/health', {}, { baseUrl, token }),
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
