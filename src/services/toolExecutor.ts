import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { logger } from '../logger';
import { execSync } from 'child_process';
import { config } from '../config';

const WORKSPACE_ROOT = config.workspaceRoot;
const HTTP_ALLOWLIST = config.httpAllowlist;

function resolveSafe(relPath: string) {
  const joined = path.resolve(WORKSPACE_ROOT, relPath);
  if (!joined.startsWith(path.resolve(WORKSPACE_ROOT))) {
    throw new Error('Access denied: path escapes workspace');
  }
  return joined;
}

export async function executeTool(name: string, rawInput: any): Promise<string> {
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  switch (name) {
    case 'fs_read': {
      const full = resolveSafe(input.path);
      return fs.readFileSync(full, 'utf8');
    }
    case 'fs_write': {
      const full = resolveSafe(input.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, input.content, 'utf8');
      return `wrote ${input.path}`;
    }
    case 'fs_list': {
      const full = resolveSafe(input.path);
      return JSON.stringify(fs.readdirSync(full));
    }
    case 'http_get': {
      const url = input.url as string;
      if (HTTP_ALLOWLIST.length && !HTTP_ALLOWLIST.some((prefix) => url.startsWith(prefix))) {
        throw new Error('URL not allowed');
      }
      const res = await fetch(url, { headers: input.headers || {} });
      const text = await res.text();
      return text;
    }
    case 'git_status': {
      return execSync('git status --porcelain', { cwd: WORKSPACE_ROOT }).toString();
    }
    case 'git_diff': {
      const file = input.file ? ['--', input.file] : [];
      return execSync(['git', 'diff', ...file].join(' '), { cwd: WORKSPACE_ROOT }).toString();
    }
    case 'git_commit': {
      if (!input.message) throw new Error('Commit message required');
      execSync('git add -A', { cwd: WORKSPACE_ROOT });
      return execSync(`git commit -m "${input.message.replace(/"/g, '\\"')}"`, { cwd: WORKSPACE_ROOT }).toString();
    }
    case 'code_analysis_summary': {
      const target = resolveSafe(input.path || '.');
      const stats = fs.statSync(target);
      return stats.isDirectory() ? `dir:${target}` : `file:${target}, size=${stats.size}`;
    }
    default:
      logger.warn({ name }, 'unknown tool');
      throw new Error(`Unknown tool ${name}`);
  }
}
