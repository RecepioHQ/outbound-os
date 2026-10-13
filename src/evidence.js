const { EVIDENCE_STATUS } = require('./model');

function normalizeEvidence(record = {}) {
  const status = Object.values(EVIDENCE_STATUS).includes(record.status)
    ? record.status
    : EVIDENCE_STATUS.UNKNOWN;
  return {
    type: String(record.type || '').trim(),
    claim: String(record.claim || '').trim(),
    status,
    source: String(record.source || '').trim(),
    observed_at: String(record.observed_at || '').trim()
  };
}

function verifiedEvidence(records = [], type) {
  return (Array.isArray(records) ? records : [])
    .map(normalizeEvidence)
    .filter((record) => record.status === EVIDENCE_STATUS.VERIFIED && (!type || record.type === type));
}

module.exports = { normalizeEvidence, verifiedEvidence };
