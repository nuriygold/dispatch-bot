#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const workspace = process.env.WORKSPACE_ROOT || process.cwd();
const FILE_LIMIT = 1000;

function resolveSafe(relPath) {
  const full = path.resolve(workspace, relPath || '.');
  if (!full.startsWith(path.resolve(workspace))) throw new Error('Access denied');
  return full;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.isDirectory()) files = files.concat(walk(path.join(dir, e.name)));
    else files.push(path.join(dir, e.name));
  }
  return files;
}

async function main() {
  const [name, rawInput] = process.argv.slice(2);
  const input = rawInput ? JSON.parse(rawInput) : {};
  if (name !== 'code_analysis_summary') throw new Error(`Unknown code tool ${name}`);
  const target = resolveSafe(input.path || '.');
  const files = fs.statSync(target).isDirectory() ? walk(target) : [target];
  const limited = files.slice(0, FILE_LIMIT);
  const totalBytes = limited.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  const extCount = {};
  let functionCount = 0;
  let fileParsed = 0;
  for (const f of limited) {
    const ext = path.extname(f) || 'none';
    extCount[ext] = (extCount[ext] || 0) + 1;
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      try {
        const code = fs.readFileSync(f, 'utf8');
        const ast = parser.parse(code, {
          sourceType: 'unambiguous',
          plugins: ['typescript', 'jsx'],
        });
        fileParsed += 1;
        functionCount += (ast.program.body || []).length;
      } catch (err) {
        // skip parse errors
      }
    }
  }
  process.stdout.write(
    JSON.stringify({
      files: limited.length,
      totalBytes,
      extensions: extCount,
      truncated: files.length > FILE_LIMIT,
      jsTsFilesParsed: fileParsed,
      approxFunctions: functionCount,
    }),
  );
}

main().catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
