#!/usr/bin/env node
require('dotenv').config();

const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
const chatApiVersion = process.env.AZURE_OPENAI_API_VERSION_CHAT || '2024-02-15-preview';
const embeddingsApiVersion = process.env.AZURE_OPENAI_API_VERSION_EMBEDDINGS || '2024-02-15-preview';

const deployments = {
  planning: process.env.AZURE_DEPLOYMENT_GPT4O || '',
  execution: process.env.AZURE_DEPLOYMENT_GPT4T || '',
  extraction: process.env.AZURE_DEPLOYMENT_GPT35 || '',
  embeddings: process.env.AZURE_DEPLOYMENT_EMBEDDINGS || process.env.AZURE_DEPLOYMENT_GPT35 || '',
};

function assertConfigured(name, value) {
  if (!value) {
    throw new Error(`Missing required Azure setting: ${name}`);
  }
}

function assertNotPlaceholder(name, value) {
  const normalized = String(value || '').trim().toLowerCase();
  const placeholders = new Set(['', 'changeme', 'https://your-resource.openai.azure.com']);
  if (placeholders.has(normalized) || normalized.includes('your-resource.openai.azure.com')) {
    throw new Error(`Azure setting ${name} still looks like a placeholder: ${value}`);
  }
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }

  return res.json();
}

function chatUrl(deployment) {
  return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(chatApiVersion)}`;
}

function embeddingsUrl(deployment) {
  return `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${encodeURIComponent(embeddingsApiVersion)}`;
}

async function validateChat(label, deployment) {
  const data = await postJson(chatUrl(deployment), {
    messages: [
      { role: 'system', content: 'Reply with exactly OK.' },
      { role: 'user', content: `Health check for ${label}.` },
    ],
    max_tokens: 16,
    temperature: 0,
  });

  const message = data?.choices?.[0]?.message;
  const content = message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('\n')
        : '';

  if (!message || !text.trim()) {
    throw new Error(`response missing assistant text`);
  }

  console.log(`${label}: ok (${deployment})`);
}

async function validateEmbeddings(deployment) {
  const data = await postJson(embeddingsUrl(deployment), { input: 'Azure embeddings health check.' });
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('response missing embedding vector');
  }
  console.log(`embeddings: ok (${deployment}, dims=${vector.length})`);
}

async function main() {
  assertConfigured('AZURE_OPENAI_ENDPOINT', endpoint);
  assertConfigured('AZURE_OPENAI_API_KEY', apiKey);
  assertConfigured('AZURE_DEPLOYMENT_GPT4O', deployments.planning);
  assertConfigured('AZURE_DEPLOYMENT_GPT4T', deployments.execution);
  assertConfigured('AZURE_DEPLOYMENT_GPT35', deployments.extraction);
  assertConfigured('AZURE_DEPLOYMENT_EMBEDDINGS', deployments.embeddings);

  assertNotPlaceholder('AZURE_OPENAI_ENDPOINT', endpoint);
  assertNotPlaceholder('AZURE_OPENAI_API_KEY', apiKey);

  console.log(`endpoint: ${endpoint}`);
  console.log(`chat api version: ${chatApiVersion}`);
  console.log(`embeddings api version: ${embeddingsApiVersion}`);

  await validateChat('planning', deployments.planning);
  await validateChat('execution', deployments.execution);
  await validateChat('extraction', deployments.extraction);
  await validateEmbeddings(deployments.embeddings);
}

main().catch((err) => {
  console.error(`azure preflight failed: ${err.message}`);
  process.exit(1);
});
