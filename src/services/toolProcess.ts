import { spawnSync } from 'child_process';
import path from 'path';
import { config } from '../config';

const toolMap: Record<string, string> = {
  fs_read: 'filesystem/cli.js',
  fs_write: 'filesystem/cli.js',
  fs_list: 'filesystem/cli.js',
  http_get: 'http/cli.js',
  http_fetch_html: 'http/cli.js',
  git_status: 'git/cli.js',
  git_diff: 'git/cli.js',
  git_commit: 'git/cli.js',
  code_analysis_summary: 'code-analysis/cli.js',
  apify_actor_run: 'apify/cli.js',
  browser_screenshot: 'browser/cli.js',
  browser_click: 'browser/cli.js',
  browser_fill: 'browser/cli.js',
};

export function runToolProcess(toolName: string, args: any): string {
  const rel = toolMap[toolName];
  if (!rel) throw new Error(`No tool process for ${toolName}`);
  const script = path.join(process.cwd(), 'packages', 'tools', rel);
  const res = spawnSync('node', [script, toolName, JSON.stringify(args || {})], {
    encoding: 'utf8',
    env: {
      ...process.env,
      WORKSPACE_ROOT: config.workspaceRoot,
      HTTP_ALLOWLIST: config.httpAllowlist.join(','),
      APIFY_ACTOR_ALLOWLIST: config.apifyAllowlist.join(','),
    },
    timeout: config.toolTimeoutMs,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(res.stderr || `tool exited ${res.status}`);
  return res.stdout || '';
}
