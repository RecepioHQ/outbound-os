function classifyMailboxEvent(message = {}) {
  const kind = String(message.kind || message.type || '').trim().toLowerCase();
  const allowed = new Set(['human_reply', 'auto_reply', 'bounce_permanent', 'delay_temporary', 'delivery']);
  if (allowed.has(kind)) return kind;
  if (message.is_human_reply === true) return 'human_reply';
  if (message.is_auto_reply === true) return 'auto_reply';
  return 'unknown';
}

module.exports = { classifyMailboxEvent };
