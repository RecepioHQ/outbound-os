const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createApproval } = require('../src/approval');

const ROOT = path.resolve(__dirname, '..');

test('CLI accepts a prepared JSON context with --input and runs a gated dry-run send', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outbound-cli-'));
  const inputPath = path.join(dir, 'send.json');
  const draft = { recipient: 'owner@customer.example', subject: 'Hello', text: 'Hello', html: '', claims: ['Verified fact'] };
  const input = {
    draft,
    approval: createApproval(draft, 'reviewer'),
    evidence_records: [{ claim: 'Verified fact', status: 'VERIFIED' }],
    gates: {
      buyer: { state: 'READY' }, evidence: { verified: true, fresh: true, attributable: true }, contact_route: { suitable: true },
      mailbox_verification: { status: 'valid', provider: 'synthetic' }, duplicate: { duplicate: false }, commercial_review: { ok: true },
      operational: { deliverability_ok: true, rate_ok: true, cap_ok: true }, authorization: { approved: true }
    }
  };
  fs.writeFileSync(inputPath, JSON.stringify(input), 'utf8');
  const result = spawnSync(process.execPath, ['src/cli.js', 'send', '--json', '--input', inputPath], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, OUTBOUND_OS_LIVE_SEND: '', OUTBOUND_OS_DATA_DIR: path.join(dir, 'state') }
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'PASS');
  assert.equal(output.transport.status, 'simulated');
  assert.equal(output.sent, false);
  assert.equal(output.simulated, true);
});
