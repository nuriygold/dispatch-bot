#!/usr/bin/env node
const fetch = require('node-fetch');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ALLOWLIST = (process.env.APIFY_ACTOR_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (!APIFY_TOKEN) {
  process.stderr.write('APIFY_TOKEN required');
  process.exit(1);
}

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  const input = rawInput ? JSON.parse(rawInput) : {};
  if (name !== 'apify_actor_run') throw new Error(`Unknown apify tool ${name}`);

  const { actorId, inputBody } = input;
  if (!actorId) throw new Error('actorId required');
  if (ALLOWLIST.length && !ALLOWLIST.includes(actorId)) {
    throw new Error('actorId not allowed');
  }

  const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputBody || {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  const data = await res.json();
  process.stdout.write(JSON.stringify(data));
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
