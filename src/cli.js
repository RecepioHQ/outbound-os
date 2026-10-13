#!/usr/bin/env node
const fs = require('node:fs');
const { normalizeIntent } = require('./model');
const { handleAction, buildActionDeps } = require('./action-api');

function readInput(argv) {
  const index = argv.indexOf('--input');
  if (index < 0) return {};
  const file = argv[index + 1];
  if (!file || file.startsWith('--')) throw new Error('--input requires a JSON file path');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main(argv = process.argv.slice(2), env = process.env, deps) {
  const json = argv.includes('--json');
  const rawIntent = argv.find((arg) => !arg.startsWith('--'));
  try {
    const intent = normalizeIntent(rawIntent);
    const input = readInput(argv);
    const resolvedDeps = deps || buildActionDeps(env);
    const result = await handleAction({ action: intent, input }, resolvedDeps);
    const payload = {
      ...result,
      intent,
      mode: resolvedDeps.config?.live_send ? 'live' : 'dry-run'
    };
    process.stdout.write(json ? JSON.stringify(payload) : `${intent}: ${payload.mode}\n`);
    return 0;
  } catch (error) {
    const payload = { ok: false, error: error.message };
    process.stderr.write(json ? JSON.stringify(payload) : `${error.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = { main };
