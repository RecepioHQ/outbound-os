const { BUYER_STATE } = require('./model');
const { verifiedEvidence } = require('./evidence');

const DIMENSIONS = ['strategic_fit', 'commercial_capacity', 'decision_access', 'trigger_timing'];
const DEFAULT_POLICY = Object.freeze({
  ready_score: 60,
  ready_minimums: {
    strategic_fit: 15,
    commercial_capacity: 10,
    decision_access: 10,
    trigger_timing: 0
  }
});

function evaluateBuyer(candidate = {}, policy = DEFAULT_POLICY) {
  if (candidate.disqualified) {
    return { state: BUYER_STATE.SKIP, score: 0, dimensions: {}, reasons: [candidate.disqualify_reason || 'Explicit disqualifying condition'] };
  }

  const source = candidate.dimensions && typeof candidate.dimensions === 'object' ? candidate.dimensions : {};
  const dimensions = {};
  const reasons = [];
  let missing = false;

  for (const name of DIMENSIONS) {
    const input = source[name];
    if (!input || typeof input !== 'object') {
      dimensions[name] = { score: 0, verified_evidence: 0 };
      reasons.push(`Missing dimension: ${name}`);
      missing = true;
      continue;
    }
    const verified = verifiedEvidence(input.evidence, name);
    const rawScore = Number(input.score);
    const score = verified.length > 0 && Number.isFinite(rawScore) && rawScore > 0 ? Math.max(0, Math.min(25, rawScore)) : 0;
    dimensions[name] = { score, verified_evidence: verified.length };
    if (verified.length === 0) reasons.push(`${name} lacks VERIFIED evidence`);
  }

  const score = DIMENSIONS.reduce((sum, name) => sum + dimensions[name].score, 0);
  if (missing) return { state: BUYER_STATE.HOLD, score, dimensions, reasons };

  const minimums = { ...DEFAULT_POLICY.ready_minimums, ...(policy.ready_minimums || {}) };
  const threshold = Number.isFinite(policy.ready_score) ? policy.ready_score : DEFAULT_POLICY.ready_score;
  const meetsMinimums = DIMENSIONS.every((name) => dimensions[name].score >= (minimums[name] || 0));

  if (score >= threshold && meetsMinimums) {
    return { state: BUYER_STATE.READY, score, dimensions, reasons };
  }

  if (!meetsMinimums) reasons.push('One or more READY minimums are not satisfied');
  if (score < threshold) reasons.push(`Score ${score} is below READY threshold ${threshold}`);
  return { state: BUYER_STATE.HOLD, score, dimensions, reasons };
}

module.exports = { DIMENSIONS, DEFAULT_POLICY, evaluateBuyer };
