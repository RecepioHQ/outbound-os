const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const pkg = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'outbound-os.js');

function invoke(...args) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, OUTBOUND_OS_LIVE_SEND: '' },
    timeout: 15000
  });
}

test('installed-command entry point matches package metadata', () => {
  assert.equal(pkg.bin['outbound-os'], 'bin/outbound-os.js');
});

test('CLI help describes offline demo and guarded actions', () => {
  const r = invoke('--help');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /outbound-os demo/);
  assert.match(r.stdout, /Live sends are disabled by default/);
});

test('CLI version matches published package metadata', () => {
  const r = invoke('--version');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), pkg.version);
});

test('offline CLI demo cannot send and ends cold eligibility after synthetic reply', () => {
  const r = invoke('demo', '--json');
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.equal(result.send_decision, 'PASS');
  assert.equal(result.transport_status, 'simulated');
  assert.equal(result.live_sent, false);
  assert.equal(result.simulated, true);
  assert.equal(result.cold_eligible_after_reply, false);
});

test('unknown commands and invalid demo arguments fail rather than falling through', () => {
  const unknown = invoke('blast');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Unknown command/);

  const invalid = invoke('demo', '--send');
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /only supports --json/);
});

test('send still delegates to existing fail-closed action handler', () => {
  const r = invoke('send', '--json');
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(r.stdout);
  assert.equal(p.intent, 'send');
  assert.equal(p.mode, 'dry-run');
  assert.equal(p.sent, false);
});
