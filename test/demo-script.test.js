const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('synthetic demo completes without network and reports Deal Mode', () => {
  const result = spawnSync(process.execPath, ['scripts/demo.js'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, OUTBOUND_OS_LIVE_SEND: '' } });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.buyer_state, 'READY');
  assert.equal(output.transport_status, 'simulated');
  assert.equal(output.live_sent, false);
  assert.equal(output.deal_stage, 'engaged');
  assert.equal(output.cold_eligible_after_reply, false);
});
