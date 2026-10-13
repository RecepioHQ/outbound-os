const test = require('node:test');
const assert = require('node:assert/strict');
const { handleAction, buildActionDeps } = require('../src/action-api');
const { createApproval } = require('../src/approval');

function sendInput() {
  const draft = { recipient: 'owner@example.com', subject: 'Hi', text: 'Hello', html: '', claims: ['Verified fact'] };
  return {
    state: { organizations: {}, deals: {}, processed_event_ids: [], blocked_addresses: {} },
    draft,
    approval: createApproval(draft, 'reviewer'),
    evidence_records: [{ claim: 'Verified fact', status: 'VERIFIED' }],
    gates: {
      buyer: { state: 'READY' }, evidence: { verified: true, fresh: true, attributable: true }, contact_route: { suitable: true },
      mailbox_verification: { status: 'valid', provider: 'synthetic' }, duplicate: { duplicate: false }, commercial_review: { ok: true },
      operational: { deliverability_ok: true, rate_ok: true, cap_ok: true }, authorization: { approved: true }
    }
  };
}

test('start/check/send actions map to the shared intent router', async () => {
  const start = await handleAction({ action: 'start', input: { buyer: { state: 'HOLD' } } }, {});
  assert.equal(start.intent, 'start');

  const check = await handleAction({ action: 'check', input: { state: {}, cursor: 0 } }, {});
  assert.equal(check.intent, 'check');

  const deps = buildActionDeps({}, {});
  const send = await handleAction({ action: 'send', input: sendInput() }, deps);
  assert.equal(send.intent, 'send');
  assert.equal(send.transport.status, 'simulated');
});

test('unsupported action is rejected', async () => {
  await assert.rejects(() => handleAction({ action: 'blast', input: {} }, {}), /unsupported intent/i);
});

test('partial live configuration cannot cause network mutation', async () => {
  let fetchCalls = 0;
  const deps = buildActionDeps({ OUTBOUND_OS_LIVE_SEND: '1', ZOHO_ACCOUNT_ID: '123' }, { fetchImpl: async () => { fetchCalls++; } });
  const result = await handleAction({ action: 'send', input: sendInput() }, deps);
  assert.equal(result.transport.status, 'simulated');
  assert.equal(fetchCalls, 0);
});
