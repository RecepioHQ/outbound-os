const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { normalizeIntent } = require('../src/model');

test('normalizeIntent accepts start/check/send case-insensitively', () => {
  assert.equal(normalizeIntent('START'), 'start');
  assert.equal(normalizeIntent(' check '), 'check');
  assert.equal(normalizeIntent('Send'), 'send');
});

test('normalizeIntent rejects unknown intent', () => {
  assert.throws(() => normalizeIntent('blast'), /unsupported intent/i);
});

test('CLI rejects unknown intent with non-zero exit', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', 'blast', '--json'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
});

test('CLI send reports dry-run mode without live configuration', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', 'send', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, OUTBOUND_OS_LIVE_SEND: '' }
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.intent, 'send');
  assert.equal(payload.mode, 'dry-run');
  assert.equal(payload.sent, false);
});
