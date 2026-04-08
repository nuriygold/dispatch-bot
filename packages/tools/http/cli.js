#!/usr/bin/env node
const fetch = require('node-fetch');

const allowlist = (process.env.HTTP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_BYTES = Number(process.env.HTTP_MAX_BYTES || 1_500_000);

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  const input = rawInput ? JSON.parse(rawInput) : {};
  if (!['http_get', 'http_fetch_html'].includes(name)) throw new Error(`Unknown http tool ${name}`);
  const url = input.url;
  if (!url) throw new Error('url required');
  if (allowlist.length && !allowlist.some((p) => url.startsWith(p))) {
    throw new Error('URL not allowed');
  }
  const res = await fetch(url, { headers: input.headers || {} });
  const reader = res.body.getReader();
  let received = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_BYTES) throw new Error('response too large');
    chunks.push(Buffer.from(value));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  process.stdout.write(text);
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
