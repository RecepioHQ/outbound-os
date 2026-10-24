const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../docs/scenario-codec.js'), 'utf8');
const window = {};
vm.runInNewContext(code, { window, URLSearchParams }, { timeout: 2000 });
const codec = window.OutboundScenarioCodec;
const flags = ['evidence', 'route', 'claims', 'duplicate', 'commercial',
  'deliverability', 'rate', 'cap', 'authorization', 'hash'];

function state(overrides = {}) {
  const base = Object.fromEntries(flags.map(key => [key, key !== 'duplicate']));
  return { buyer: 'READY', mailbox: 'valid', ...base, ...overrides };
}

test('sharing a synthetic scenario is deterministic and round trips safely', () => {
  const input = state({ buyer: 'HOLD', mailbox: 'unknown', claims: false });
  const hash = codec.encode(input);
  assert.match(hash, /^#buyer=HOLD&mailbox=unknown/);
  assert.deepEqual(JSON.parse(JSON.stringify(codec.decode(hash))), input);
  assert.equal(codec.encode(codec.decode(hash)), hash);
});

test('all preset-like synthetic scenarios round trip', () => {
  for (const overrides of [
    {}, { mailbox: 'unknown' }, { claims: false }, { authorization: false },
    { duplicate: true }, { buyer: 'SKIP' }, { mailbox: 'catch_all' }
  ]) {
    const input = state(overrides);
    const parsed = codec.decode(codec.encode(input));
    assert.deepEqual(JSON.parse(JSON.stringify(parsed)), input);
  }
});

test('rejects tampered, oversized, incomplete and duplicated URL params', () => {
  const hash = codec.encode(state());
  for (const bad of [
    '#bad=1', hash + '&claims=1', hash.replace('mailbox=valid', 'mailbox=untrusted'),
    hash.replace('buyer=READY', 'buyer=<img>'),
    hash.replace('evidence=1', 'evidence=yes'), hash.slice(0, 20),
    '#' + 'a'.repeat(600), hash + '&email=secret@example.com'
  ]) assert.equal(codec.decode(bad), null, bad);
});

test('never embeds real email or arbitrary text in shared URLs', () => {
  assert.throws(() => codec.encode(state({ buyer: 'CUSTOM' })), /Invalid/);
  assert.throws(() => codec.encode(state({ evidence: 'yes' })), /Invalid/);
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|WebSocket/);
});
