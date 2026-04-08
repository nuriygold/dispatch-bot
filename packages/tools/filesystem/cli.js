#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const workspace = process.env.WORKSPACE_ROOT || process.cwd();

function resolveSafe(relPath) {
  const full = path.resolve(workspace, relPath);
  if (!full.startsWith(path.resolve(workspace))) {
    throw new Error('Access denied: path escapes workspace');
  }
  return full;
}

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  if (!name) throw new Error('Tool name required');
  const input = rawInput ? JSON.parse(rawInput) : {};
  switch (name) {
    case 'fs_read': {
      const file = resolveSafe(input.path);
      process.stdout.write(fs.readFileSync(file, 'utf8'));
      break;
    }
    case 'fs_write': {
      const file = resolveSafe(input.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, input.content || '', 'utf8');
      process.stdout.write(`wrote ${input.path}`);
      break;
    }
    case 'fs_list': {
      const dir = resolveSafe(input.path || '.');
      process.stdout.write(JSON.stringify(fs.readdirSync(dir)));
      break;
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
