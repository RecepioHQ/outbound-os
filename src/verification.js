const { MAILBOX_STATUS } = require('./model');

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  if (raw === 'catchall') return MAILBOX_STATUS.CATCH_ALL;
  if (raw === 'catch_all') return MAILBOX_STATUS.CATCH_ALL;
  if (raw === 'valid') return MAILBOX_STATUS.VALID;
  if (raw === 'invalid') return MAILBOX_STATUS.INVALID;
  if (raw === 'error') return MAILBOX_STATUS.ERROR;
  return MAILBOX_STATUS.UNKNOWN;
}

function normalizeVerification(result = {}) {
  return {
    status: normalizeStatus(result.status),
    provider: String(result.provider || 'unknown'),
    checked_at: String(result.checked_at || ''),
    reason: String(result.reason || '')
  };
}

function isStrictlyValidMailbox(result) {
  return normalizeVerification(result).status === MAILBOX_STATUS.VALID;
}

module.exports = { normalizeVerification, isStrictlyValidMailbox };
