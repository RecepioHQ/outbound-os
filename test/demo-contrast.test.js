const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { runContrastDemo } = require('../scripts/demo-contrast');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'outbound-os.js');

test('synthetic contrast demo shows one passing and one blocked send', async () => {
  const result = await runContrastDemo();

  assert.equal(result.scenario, 'offline-synthetic-contrast');
  assert.equal(result.allowed.send_decision, 'PASS');
  assert.equal(result.allowed.live_sent, false);
  assert.equal(result.allowed.transport_status, 'simulated');
  assert.equal(result.blocked.send_decision, 'BLOCK');
  assert.equal(result.blocked.mailbox_status, 'unknown');
  assert.equal(result.blocked.live_sent, false);
  assert.equal(result.blocked.transport_calls, 0);
  assert.deepEqual(result.blocked.blocking_gates.map((gate) => gate.name), ['mailbox_verification']);
  assert.match(result.blocked.blocking_gates[0].reason, /not strictly valid/i);
});

test('public CLI exposes compare mode but preserves default demo', () => {
  const contrast = spawnSync(process.execPath, [CLI, 'demo', '--compare'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000
  });
  assert.equal(contrast.status, 0, contrast.stderr);
  const result = JSON.parse(contrast.stdout);
  assert.equal(result.blocked.transport_calls, 0);
  assert.equal(result.allowed.live_sent, false);

  const baseline = spawnSync(process.execPath, [CLI, 'demo', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000
  });
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(JSON.parse(baseline.stdout).send_decision, 'PASS');
});

test('compare demo does not accept unexpected flags', () => {
  const result = spawnSync(process.execPath, [CLI, 'demo', '--compare', '--live'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /only supports/);
});
