const EVIDENCE_STATUS = Object.freeze({ VERIFIED: 'VERIFIED', INFERRED: 'INFERRED', UNKNOWN: 'UNKNOWN' });
const BUYER_STATE = Object.freeze({ READY: 'READY', HOLD: 'HOLD', SKIP: 'SKIP' });
const GATE_RESULT = Object.freeze({ PASS: 'PASS', HOLD: 'HOLD', BLOCK: 'BLOCK' });
const MAILBOX_STATUS = Object.freeze({ VALID: 'valid', INVALID: 'invalid', CATCH_ALL: 'catch_all', UNKNOWN: 'unknown', ERROR: 'error' });
const EVENT_TYPE = Object.freeze({
  SENT: 'sent', HUMAN_REPLY: 'human_reply', AUTO_REPLY: 'auto_reply', BOUNCE_PERMANENT: 'bounce_permanent',
  DELAY_TEMPORARY: 'delay_temporary', DELIVERY: 'delivery', UNKNOWN: 'unknown'
});

function normalizeIntent(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!['start', 'check', 'send'].includes(normalized)) {
    throw new Error(`Unsupported intent: ${value}`);
  }
  return normalized;
}

module.exports = { EVIDENCE_STATUS, BUYER_STATE, GATE_RESULT, MAILBOX_STATUS, EVENT_TYPE, normalizeIntent };
