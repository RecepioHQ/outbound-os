const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readEvents(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return [];
  const lines = fs.readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((line, index) => {
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object') throw new Error('not object');
      return event;
    } catch (error) {
      throw new Error(`Malformed ledger line ${index + 1}`);
    }
  });
}

function appendEvent(ledgerPath, event) {
  const normalized = { ...event, event_id: event.event_id || crypto.randomUUID() };
  const existing = readEvents(ledgerPath);
  const duplicate = existing.find((item) => item.event_id === normalized.event_id);
  if (duplicate) return duplicate;
  ensureParent(ledgerPath);
  fs.appendFileSync(ledgerPath, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

module.exports = { appendEvent, readEvents };
