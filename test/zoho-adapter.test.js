const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');
const { ZohoAdapter } = require('../src/adapters/zoho');
const { createApproval } = require('../src/approval');

function response(status, body, textBody) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return textBody ?? JSON.stringify(body); }
  };
}

function liveConfig() {
  return loadConfig({
    OUTBOUND_OS_LIVE_SEND: '1',
    ZOHO_ACCOUNTS_BASE_URL: 'https://accounts.example.com',
    ZOHO_MAIL_BASE_URL: 'https://mail.example.com',
    ZOHO_ACCOUNT_ID: '123',
    ZOHO_FROM_ADDRESS: 'sender@example.com',
    ZOHO_CLIENT_ID: 'client',
    ZOHO_CLIENT_SECRET: 'secret',
    ZOHO_REFRESH_TOKEN: 'refresh'
  });
}

test('listEvents retries transient read failure and returns messages', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (calls.length === 1) return response(200, { access_token: 'token', expires_in: 3600 });
    if (calls.length === 2) return response(500, { error: 'temporary' });
    return response(200, { data: [{ provider_event_id: 'm1', kind: 'delivery' }] });
  };
  const adapter = new ZohoAdapter(liveConfig(), { fetchImpl });
  const result = await adapter.listEvents(0);
  assert.equal(result.events.length, 1);
  assert.equal(calls.filter((c) => c.url.includes('/messages/view')).length, 2);
});

test('send requires explicit live config and matching approval', async () => {
  const draft = { recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '' };
  const approval = createApproval(draft, 'reviewer');
  let calls = 0;
  const adapter = new ZohoAdapter(loadConfig({}), { fetchImpl: async () => { calls++; } });
  await assert.rejects(() => adapter.sendApprovedMessage(draft, approval), /live send is not enabled/i);
  assert.equal(calls, 0);
});

test('approval mismatch blocks before any network mutation', async () => {
  const draft = { recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '' };
  const approval = createApproval(draft, 'reviewer');
  const changed = { ...draft, subject: 'Changed' };
  let calls = 0;
  const adapter = new ZohoAdapter(liveConfig(), { fetchImpl: async () => { calls++; } });
  await assert.rejects(() => adapter.sendApprovedMessage(changed, approval), /approval/i);
  assert.equal(calls, 0);
});

test('send posts once and does not blindly retry ambiguous mutation failure', async () => {
  const draft = { recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '<p>Hello</p>' };
  const approval = createApproval(draft, 'reviewer');
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    if (calls.length === 1) return response(200, { access_token: 'token', expires_in: 3600 });
    throw new Error('socket reset after write');
  };
  const adapter = new ZohoAdapter(liveConfig(), { fetchImpl });
  const result = await adapter.sendApprovedMessage(draft, approval);
  assert.equal(result.status, 'ambiguous');
  assert.equal(calls.filter((c) => c.method === 'POST' && c.url.includes('/messages')).length, 1);
});

test('successful send uses official messages endpoint and can reconcile by original message id', async () => {
  const draft = { recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '' };
  const approval = createApproval(draft, 'reviewer');
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    if (calls.length === 1) return response(200, { access_token: 'token', expires_in: 3600 });
    if (calls.length === 2) return response(200, { data: { messageId: 'm-123' } });
    return response(200, {}, 'MIME-CONTENT');
  };
  const adapter = new ZohoAdapter(liveConfig(), { fetchImpl });
  const sent = await adapter.sendApprovedMessage(draft, approval);
  assert.equal(sent.status, 'sent');
  assert.equal(sent.message_id, 'm-123');
  assert.match(calls[1].url, /\/api\/accounts\/123\/messages$/);
  const reconciled = await adapter.reconcileSent(sent);
  assert.equal(reconciled.status, 'confirmed');
  assert.equal(reconciled.message, 'MIME-CONTENT');
});
