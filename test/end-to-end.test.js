const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateBuyer } = require('../src/buyer-selection');
const { createApproval } = require('../src/approval');
const { runIntent } = require('../src/intent-router');
const { DryRunTransport } = require('../src/adapters/dry-run-transport');
const { MockMailboxAdapter } = require('../src/adapters/mock-mailbox');

function verified(type, claim) {
  return { type, claim, status: 'VERIFIED', source: `https://northstar.example/${type}`, observed_at: '2026-10-13T10:00:00Z' };
}

test('synthetic buyer -> gated dry-run -> human reply -> Deal Mode works end to end', async () => {
  const buyer = evaluateBuyer({
    name: 'Northstar Example',
    dimensions: {
      strategic_fit: { score: 22, evidence: [verified('strategic_fit', 'Offers a receptionist product')] },
      commercial_capacity: { score: 18, evidence: [verified('commercial_capacity', 'Has a public commercial plan')] },
      decision_access: { score: 16, evidence: [verified('decision_access', 'Has an official commercial route')] },
      trigger_timing: { score: 12, evidence: [verified('trigger_timing', 'Has a synthetic launch signal')] }
    }
  });
  assert.equal(buyer.state, 'READY');

  const state = {
    organizations: {
      'northstar.example': {
        key: 'northstar.example', name: 'Northstar Example', domain: 'northstar.example', cold_eligible: true,
        contacts: { 'owner@northstar.example': { email: 'owner@northstar.example' } }
      }
    },
    deals: {}, processed_event_ids: [], blocked_addresses: {}
  };
  const draft = {
    recipient: 'owner@northstar.example', subject: 'A relevant idea', text: 'I noticed your receptionist product.', html: '',
    claims: ['Offers a receptionist product']
  };
  const approval = createApproval(draft, 'commercial-review');
  const send = await runIntent('send', {
    state, draft, approval,
    evidence_records: [{ claim: 'Offers a receptionist product', status: 'VERIFIED' }],
    gates: {
      buyer,
      evidence: { verified: true, fresh: true, attributable: true },
      contact_route: { suitable: true },
      mailbox_verification: { status: 'valid', provider: 'synthetic' },
      duplicate: { duplicate: false },
      commercial_review: { ok: true },
      operational: { deliverability_ok: true, rate_ok: true, cap_ok: true },
      authorization: { approved: true }
    }
  }, { transport: new DryRunTransport() });

  assert.equal(send.decision, 'PASS');
  assert.equal(send.transport.status, 'simulated');
  assert.equal(send.sent, false, 'dry-run must not claim a live email was sent');
  assert.equal(send.simulated, true);

  const mailbox = new MockMailboxAdapter([{
    provider_event_id: 'reply-001', kind: 'human_reply', organization_key: 'northstar.example',
    email: 'owner@northstar.example', body: 'Send me the details.', received_at: '2026-10-13T12:00:00Z'
  }]);
  const check = await runIntent('check', { state, cursor: 0 }, { mailbox });
  assert.equal(check.state.organizations['northstar.example'].cold_eligible, false);
  assert.equal(check.state.deals['deal:northstar.example'].stage, 'engaged');
  assert.equal(check.state.deals['deal:northstar.example'].latest_human_reply.body, 'Send me the details.');
});
