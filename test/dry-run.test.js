const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');
const { DryRunTransport } = require('../src/adapters/dry-run-transport');

test('default config is dry-run and does not require provider credentials', () => {
  const config = loadConfig({});
  assert.equal(config.live_send, false);
  assert.equal(config.live_requested, false);
});

test('live flag without complete Zoho configuration remains non-live', () => {
  const config = loadConfig({ OUTBOUND_OS_LIVE_SEND: '1', ZOHO_ACCOUNT_ID: '123' });
  assert.equal(config.live_requested, true);
  assert.equal(config.live_send, false);
  assert.ok(config.missing.length > 0);
});

test('credentials without explicit live flag remain non-live', () => {
  const config = loadConfig({
    ZOHO_ACCOUNT_ID: '123', ZOHO_FROM_ADDRESS: 'sender@example.com', ZOHO_CLIENT_ID: 'client',
    ZOHO_CLIENT_SECRET: 'secret', ZOHO_REFRESH_TOKEN: 'refresh'
  });
  assert.equal(config.live_send, false);
});

test('DryRunTransport returns simulated result without network', async () => {
  let networkCalls = 0;
  const transport = new DryRunTransport({ fetchImpl: async () => { networkCalls++; } });
  const result = await transport.send({ recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '' });
  assert.equal(result.status, 'simulated');
  assert.equal(networkCalls, 0);
  assert.match(result.message_id, /^dry-/);
});
