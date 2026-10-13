const crypto = require('node:crypto');
const { canonicalMessage } = require('../approval');

class DryRunTransport {
  constructor() {}

  async send(message) {
    const digest = crypto.createHash('sha256').update(canonicalMessage(message), 'utf8').digest('hex').slice(0, 16);
    return { status: 'simulated', message_id: `dry-${digest}` };
  }
}

module.exports = { DryRunTransport };
