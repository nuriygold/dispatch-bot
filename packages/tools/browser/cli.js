#!/usr/bin/env node
const chromium = require('playwright').chromium;

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  const input = rawInput ? JSON.parse(rawInput) : {};
  if (!['browser_screenshot', 'browser_click', 'browser_fill'].includes(name)) {
    throw new Error(`Unknown browser tool ${name}`);
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(10000);
  try {
    if (!input.url) throw new Error('url required');
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 20000 });
    if (name === 'browser_click') {
      if (!input.selector) throw new Error('selector required');
      await page.click(input.selector, { timeout: 5000 });
      process.stdout.write('clicked');
    } else if (name === 'browser_fill') {
      if (!input.selector || input.value === undefined) throw new Error('selector and value required');
      await page.fill(input.selector, String(input.value), { timeout: 5000 });
      if (input.submitSelector) await page.click(input.submitSelector, { timeout: 5000 });
      process.stdout.write('filled');
    } else if (name === 'browser_screenshot') {
      const buf = await page.screenshot({ fullPage: true });
      if (buf.length > 1.5e6) throw new Error('screenshot too large');
      process.stdout.write(buf.toString('base64'));
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
