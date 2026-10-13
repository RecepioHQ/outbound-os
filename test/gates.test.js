const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVerification, isStrictlyValidMailbox } = require('../src/verification');
const { evaluateSendGates } = require('../src/gates');

function validContext() {
  return {
    buyer: { state: 'READY' },
    evidence: { verified: true, fresh: true, attributable: true },
    contact_route: { suitable: true },
    mailbox_verification: { status: 'valid', provider: 'synthetic' },
    duplicate: { duplicate: false },
    personalization: { supported: true },
    preflight: { ok: true },
    commercial_review: { ok: true },
    operational: { deliverability_ok: true, rate_ok: true, cap_ok: true },
    authorization: { approved: true },
    approval: { matches: true }
  };
}

test('only valid mailbox passes strict verification', () => {
  assert.equal(isStrictlyValidMailbox({ status: 'valid' }), true);
  for (const status of ['invalid', 'catch_all', 'unknown', 'error']) {
    assert.equal(isStrictlyValidMailbox({ status }), false, status);
  }
  assert.equal(normalizeVerification({ status: 'catch-all', provider: 'x' }).status, 'catch_all');
});

test('invalid, catch-all, unknown and error mailbox statuses BLOCK send', () => {
  for (const status of ['invalid', 'catch_all', 'unknown', 'error']) {
    const context = validContext();
    context.mailbox_verification.status = status;
    assert.equal(evaluateSendGates(context).decision, 'BLOCK', status);
  }
});

test('UNKNOWN/unverified evidence cannot satisfy evidence gate', () => {
  const context = validContext();
  context.evidence.verified = false;
  const result = evaluateSendGates(context);
  assert.equal(result.decision, 'BLOCK');
  assert.ok(result.gates.some((gate) => gate.name === 'evidence' && gate.result === 'BLOCK'));
});

test('duplicate blocks send', () => {
  const context = validContext();
  context.duplicate = { duplicate: true, kind: 'organization' };
  assert.equal(evaluateSendGates(context).decision, 'BLOCK');
});

test('operational or deliverability blocker blocks send', () => {
  const context = validContext();
  context.operational.deliverability_ok = false;
  assert.equal(evaluateSendGates(context).decision, 'BLOCK');
});

test('rate and cap gates cannot be overridden by requested intent', () => {
  for (const field of ['rate_ok', 'cap_ok']) {
    const context = validContext();
    context.requested_intent = 'send';
    context.operational[field] = false;
    assert.equal(evaluateSendGates(context).decision, 'BLOCK', field);
  }
});

test('complete passing context returns PASS', () => {
  assert.equal(evaluateSendGates(validContext()).decision, 'PASS');
});
