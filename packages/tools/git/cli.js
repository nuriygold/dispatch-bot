#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const workspace = process.env.WORKSPACE_ROOT || process.cwd();

function run(cmd) {
  return execSync(cmd, { cwd: workspace }).toString();
}

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  const input = rawInput ? JSON.parse(rawInput) : {};
  switch (name) {
    case 'git_status':
      process.stdout.write(run('git status --porcelain'));
      break;
    case 'git_diff': {
      const file = input.file ? ` -- ${input.file}` : '';
      process.stdout.write(run(`git diff${file}`));
      break;
    }
    case 'git_commit': {
      if (!input.message) throw new Error('message required');
      run('git add -A');
      process.stdout.write(run(`git commit -m "${String(input.message).replace(/"/g, '\\"')}"`));
      break;
    }
    default:
      throw new Error(`Unknown git tool ${name}`);
  }
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
