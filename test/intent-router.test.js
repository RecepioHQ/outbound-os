const test = require('node:test');
const assert = require('node:assert/strict');
const { runIntent } = require('../src/intent-router');
const { routeSkill } = require('../src/skill-router');
const { createApproval } = require('../src/approval');
const { MockMailboxAdapter } = require('../src/adapters/mock-mailbox');

function baseState() {
  return {
    organizations: {
      'example.com': {
        key: 'example.com', name: 'Example Co', domain: 'example.com', cold_eligible: true,
        contacts: { 'owner@example.com': { email: 'owner@example.com' } }
      }
    },
    deals: {}, processed_event_ids: [], blocked_addresses: {}
  };
}

function sendContext() {
  const draft = { recipient: 'owner@example.com', subject: 'Hello', text: 'Hello there', html: '', claims: ['Verified fact'] };
  const approval = createApproval(draft, 'reviewer');
  return {
    state: baseState(), draft, approval,
    evidence_records: [{ claim: 'Verified fact', status: 'VERIFIED' }],
    gates: {
      buyer: { state: 'READY' },
      evidence: { verified: true, fresh: true, attributable: true },
      contact_route: { suitable: true },
      mailbox_verification: { status: 'valid', provider: 'synthetic' },
      duplicate: { duplicate: false },
      commercial_review: { ok: true },
      operational: { deliverability_ok: true, rate_ok: true, cap_ok: true },
      authorization: { approved: true }
    }
  };
}

test('Start is read/plan-only and never calls transport', async () => {
  let calls = 0;
  const result = await runIntent('start', { state: baseState(), buyer: { state: 'HOLD' } }, { transport: { send: async () => { calls++; } } });
  assert.equal(calls, 0);
  assert.equal(result.intent, 'start');
  assert.equal(result.skill, 'buyer-research');
});

test('Check reconciles mock mailbox events', async () => {
  const mailbox = new MockMailboxAdapter([{ provider_event_id: 'reply-1', kind: 'human_reply', organization_key: 'example.com', email: 'owner@example.com', body: 'Interested', received_at: '2026-10-13T12:00:00Z' }]);
  const result = await runIntent('check', { state: baseState(), cursor: 0 }, { mailbox });
  assert.equal(result.state.organizations['example.com'].cold_eligible, false);
  assert.equal(result.state.deals['deal:example.com'].stage, 'engaged');
});

test('Send cannot bypass hard gates', async () => {
  let calls = 0;
  const context = sendContext();
  context.gates.mailbox_verification.status = 'unknown';
  const result = await runIntent('send', context, { transport: { send: async () => { calls++; return { status: 'sent' }; } } });
  assert.equal(result.sent, false);
  assert.equal(result.decision, 'BLOCK');
  assert.equal(calls, 0);
});

test('Send calls transport only after preflight, approval and gates pass', async () => {
  let calls = 0;
  const result = await runIntent('send', sendContext(), { transport: { send: async () => { calls++; return { status: 'simulated', message_id: 'demo-1' }; } } });
  assert.equal(result.sent, false);
  assert.equal(result.simulated, true);
  assert.equal(result.executed, true);
  assert.equal(result.decision, 'PASS');
  assert.equal(calls, 1);
});

test('human reply context routes to engaged-deal', () => {
  assert.equal(routeSkill({ human_reply: true }), 'engaged-deal');
});

test('permanent bounce context routes to delivery-recovery', () => {
  assert.equal(routeSkill({ delivery_failure: 'permanent' }), 'delivery-recovery');
});
