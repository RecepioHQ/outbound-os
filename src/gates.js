const { BUYER_STATE, GATE_RESULT } = require('./model');
const { isStrictlyValidMailbox } = require('./verification');

function gate(name, result, reason) {
  return { name, result, reason };
}

function evaluateSendGates(context = {}) {
  const gates = [];
  const add = (name, result, reason) => {
    const item = gate(name, result, reason);
    gates.push(item);
    return item;
  };

  if (context.buyer?.state === BUYER_STATE.SKIP) add('buyer_selection', GATE_RESULT.BLOCK, 'Buyer is SKIP');
  else if (context.buyer?.state !== BUYER_STATE.READY) add('buyer_selection', GATE_RESULT.HOLD, 'Buyer is not READY');
  else add('buyer_selection', GATE_RESULT.PASS, 'Buyer is READY');

  if (!context.evidence?.verified || !context.evidence?.fresh || !context.evidence?.attributable) add('evidence', GATE_RESULT.BLOCK, 'Required evidence is not verified, fresh, and attributable');
  else add('evidence', GATE_RESULT.PASS, 'Evidence requirements pass');

  if (!context.contact_route?.suitable) add('contact_route', GATE_RESULT.BLOCK, 'Contact route is unsuitable');
  else add('contact_route', GATE_RESULT.PASS, 'Contact route passes');

  if (!isStrictlyValidMailbox(context.mailbox_verification)) add('mailbox_verification', GATE_RESULT.BLOCK, 'Mailbox is not strictly valid');
  else add('mailbox_verification', GATE_RESULT.PASS, 'Mailbox is valid');

  if (context.duplicate?.duplicate) add('dedupe', GATE_RESULT.BLOCK, `Duplicate ${context.duplicate.kind || 'record'}`);
  else add('dedupe', GATE_RESULT.PASS, 'No duplicate found');

  if (!context.personalization?.supported) add('personalization', GATE_RESULT.BLOCK, 'Personalization is not fully supported by evidence');
  else add('personalization', GATE_RESULT.PASS, 'Personalization supported');

  if (!context.preflight?.ok) add('preflight', GATE_RESULT.BLOCK, 'Preflight failed');
  else add('preflight', GATE_RESULT.PASS, 'Preflight passed');

  if (!context.commercial_review?.ok) add('commercial_review', GATE_RESULT.BLOCK, 'Commercial review failed');
  else add('commercial_review', GATE_RESULT.PASS, 'Commercial review passed');

  const op = context.operational || {};
  if (!op.deliverability_ok) add('deliverability', GATE_RESULT.BLOCK, 'Deliverability health blocks sending');
  else add('deliverability', GATE_RESULT.PASS, 'Deliverability health passes');
  if (!op.rate_ok) add('rate', GATE_RESULT.BLOCK, 'Rate limit blocks sending');
  else add('rate', GATE_RESULT.PASS, 'Rate gate passes');
  if (!op.cap_ok) add('cap', GATE_RESULT.BLOCK, 'Volume cap blocks sending');
  else add('cap', GATE_RESULT.PASS, 'Volume cap passes');

  if (!context.authorization?.approved) add('authorization', GATE_RESULT.HOLD, 'Explicit send authorization missing');
  else add('authorization', GATE_RESULT.PASS, 'Authorization present');

  if (!context.approval?.matches) add('approval_hash', GATE_RESULT.BLOCK, 'Approval hash is missing or does not match');
  else add('approval_hash', GATE_RESULT.PASS, 'Approval hash matches');

  const decision = gates.some((item) => item.result === GATE_RESULT.BLOCK)
    ? GATE_RESULT.BLOCK
    : gates.some((item) => item.result === GATE_RESULT.HOLD)
      ? GATE_RESULT.HOLD
      : GATE_RESULT.PASS;
  return { decision, gates };
}

module.exports = { evaluateSendGates };
