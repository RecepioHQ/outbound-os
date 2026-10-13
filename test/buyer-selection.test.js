const test = require('node:test');
const assert = require('node:assert/strict');
const { EVIDENCE_STATUS, BUYER_STATE } = require('../src/model');
const { normalizeEvidence, verifiedEvidence } = require('../src/evidence');
const { evaluateBuyer } = require('../src/buyer-selection');

function ev(type, status = EVIDENCE_STATUS.VERIFIED) {
  return { type, claim: `${type} claim`, status, source: `https://example.com/${type}`, observed_at: '2026-10-13T10:00:00Z' };
}

test('normalizes evidence and filters only verified evidence by type', () => {
  const records = [ev('strategic_fit'), ev('strategic_fit', EVIDENCE_STATUS.UNKNOWN), ev('decision_access')];
  assert.equal(normalizeEvidence(records[0]).status, EVIDENCE_STATUS.VERIFIED);
  assert.equal(verifiedEvidence(records, 'strategic_fit').length, 1);
});

test('buyer with verified evidence and sufficient dimensions is READY', () => {
  const result = evaluateBuyer({
    name: 'Northstar Example',
    dimensions: {
      strategic_fit: { score: 22, evidence: [ev('strategic_fit')] },
      commercial_capacity: { score: 18, evidence: [ev('commercial_capacity')] },
      decision_access: { score: 16, evidence: [ev('decision_access')] },
      trigger_timing: { score: 12, evidence: [ev('trigger_timing')] }
    }
  });
  assert.equal(result.state, BUYER_STATE.READY);
  assert.equal(result.score, 68);
});

test('UNKNOWN evidence contributes zero and keeps candidate on HOLD', () => {
  const result = evaluateBuyer({
    name: 'Unknown Example',
    dimensions: {
      strategic_fit: { score: 22, evidence: [ev('strategic_fit')] },
      commercial_capacity: { score: 20, evidence: [ev('commercial_capacity', EVIDENCE_STATUS.UNKNOWN)] },
      decision_access: { score: 18, evidence: [ev('decision_access', EVIDENCE_STATUS.UNKNOWN)] },
      trigger_timing: { score: 10, evidence: [ev('trigger_timing')] }
    }
  });
  assert.equal(result.state, BUYER_STATE.HOLD);
  assert.equal(result.dimensions.commercial_capacity.score, 0);
  assert.equal(result.dimensions.decision_access.score, 0);
});

test('malformed or missing dimensions fail closed to HOLD with reason', () => {
  const result = evaluateBuyer({ name: 'Partial Example', dimensions: { strategic_fit: { score: 20, evidence: [ev('strategic_fit')] } } });
  assert.equal(result.state, BUYER_STATE.HOLD);
  assert.ok(result.reasons.some((reason) => /missing dimension/i.test(reason)));
});

test('explicit disqualifying fit condition is SKIP', () => {
  const result = evaluateBuyer({ name: 'Bad Fit Example', disqualified: true, disqualify_reason: 'No relevant use case', dimensions: {} });
  assert.equal(result.state, BUYER_STATE.SKIP);
  assert.ok(result.reasons.includes('No relevant use case'));
});
