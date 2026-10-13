const crypto = require('node:crypto');

function canonicalMessage(message = {}) {
  return JSON.stringify({
    recipient: String(message.recipient || ''),
    subject: String(message.subject || ''),
    text: String(message.text || ''),
    html: String(message.html || '')
  });
}

function hashMessage(message) {
  return crypto.createHash('sha256').update(canonicalMessage(message), 'utf8').digest('hex');
}

function createApproval(message, reviewer) {
  return {
    reviewer: String(reviewer || 'unknown'),
    approved_at: new Date().toISOString(),
    message_sha256: hashMessage(message)
  };
}

function approvalMatches(message, approval = {}) {
  return Boolean(approval.message_sha256) && approval.message_sha256 === hashMessage(message);
}

module.exports = { canonicalMessage, hashMessage, createApproval, approvalMatches };
