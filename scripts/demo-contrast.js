'use strict';

const { runDemo } = require('./demo');
const { runIntent } = require('../src/intent-router');
const { createApproval } = require('../src/approval');

/**
 * Contrast a successful synthetic workflow with a deliberately blocked one.
 * No provider keys, real recipients, or network-backed transports are used.
 */
async function runContrastDemo() {
  const allowed = await runDemo();

  const draft = {
    recipient: 'owner@northstar.example',
    subject: 'A relevant idea',
    text: 'I noticed your receptionist product.',
    html: '',
    claims: ['Offers a receptionist product']
  };
  let transportCalls = 0;
  const blocked = await runIntent('send', {
    draft,
    approval: createApproval(draft, 'synthetic-review'),
    evidence_records: [{ claim: 'Offers a receptionist product', status: 'VERIFIED' }],
    gates: {
      buyer: { state: 'READY' },
      evidence: { verified: true, fresh: true, attributable: true },
      contact_route: { suitable: true },
      mailbox_verification: { status: 'unknown', provider: 'synthetic' },
      duplicate: { duplicate: false },
      commercial_review: { ok: true },
      operational: { deliverability_ok: true, rate_ok: true, cap_ok: true },
      authorization: { approved: true }
    }
  }, {
    transport: {
      send: async () => {
        transportCalls += 1;
        return { status: 'sent' };
      }
    }
  });

  const blockingGates = (blocked.gates || [])
    .filter((gate) => gate.result !== 'PASS')
    .map(({ name, result, reason }) => ({ name, result, reason }));

  if (blocked.decision !== 'BLOCK' || blocked.sent !== false || transportCalls !== 0 ||
      blockingGates.length !== 1 || blockingGates[0].name !== 'mailbox_verification') {
    throw new Error('Contrast demo invariant failed: the unsafe send was not blocked as expected');
  }

  return {
    scenario: 'offline-synthetic-contrast',
    allowed: {
      buyer_state: allowed.buyer_state,
      send_decision: allowed.send_decision,
      transport_status: allowed.transport_status,
      live_sent: allowed.live_sent,
      cold_eligible_after_reply: allowed.cold_eligible_after_reply
    },
    blocked: {
      mailbox_status: 'unknown',
      send_decision: blocked.decision,
      blocking_gates: blockingGates,
      transport_calls: transportCalls,
      live_sent: false
    },
    note: 'Both workflows use synthetic inputs; no actual mailbox was contacted.'
  };
}

if (require.main === module) {
  runContrastDemo().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { runContrastDemo };
