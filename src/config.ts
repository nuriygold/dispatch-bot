import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  wsPath: process.env.WEB_SOCKET_PATH || '/ws',
  postgresUrl: required('POSTGRES_URL'),
  redisUrl: required('REDIS_URL'),
  apiToken: process.env.DISPATCH_API_TOKEN || '',
  adminToken: process.env.DISPATCH_ADMIN_TOKEN || '',
  workspaceRoot: process.env.WORKSPACE_ROOT || process.cwd(),
  httpAllowlist: (process.env.HTTP_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  apifyAllowlist: (process.env.APIFY_ACTOR_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  toolAllowlist: (process.env.TOOL_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  toolDenylist: (process.env.TOOL_DENYLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  offlineMode: process.env.OFFLINE_MODE === '1' || process.env.OFFLINE_MODE === 'true',
  toolTimeoutMs: Number(process.env.TOOL_TIMEOUT_MS || 20000),
  executionRequeueDelayMs: Number(process.env.EXECUTION_REQUEUE_DELAY_MS || 5000),
  wsProgressIntervalMs: Number(process.env.WS_PROGRESS_INTERVAL_MS || 5000),
  queueStuckThresholdMs: Number(process.env.QUEUE_STUCK_THRESHOLD_MS || 300000),
  cost: {
    inputTokenCents: Number(process.env.COST_PER_INPUT_TOKEN_CENTS || 0),
    outputTokenCents: Number(process.env.COST_PER_OUTPUT_TOKEN_CENTS || 0),
  },
  azure: {
    endpoint: required('AZURE_OPENAI_ENDPOINT').replace(/\/+$/, ''),
    apiKey: required('AZURE_OPENAI_API_KEY'),
    apiVersions: {
      chatCompletions: process.env.AZURE_OPENAI_API_VERSION_CHAT || '2024-02-15-preview',
      embeddings: process.env.AZURE_OPENAI_API_VERSION_EMBEDDINGS || '2024-02-15-preview',
    },
    deployments: {
      gpt4o: required('AZURE_DEPLOYMENT_GPT4O'),
      gpt4t: required('AZURE_DEPLOYMENT_GPT4T'),
      gpt35: required('AZURE_DEPLOYMENT_GPT35'),
      embeddings: process.env.AZURE_DEPLOYMENT_EMBEDDINGS || process.env.AZURE_DEPLOYMENT_GPT35 || '',
    },
  },
  callbackSecret: required('CALLBACK_SECRET'),
};
