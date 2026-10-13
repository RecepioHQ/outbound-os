const { approvalMatches } = require('../approval');
const { canonicalEmail } = require('../dedupe');

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');
}

function extractEmails(value) {
  const decoded = decodeBasicEntities(value);
  return Array.from(decoded.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi), (match) => canonicalEmail(match[0]));
}

function normalizeZohoMessage(message = {}, config = {}) {
  const subject = decodeBasicEntities(message.subject);
  const summary = decodeBasicEntities(message.summary);
  const from = canonicalEmail(message.fromAddress);
  const text = `${subject}\n${summary}\n${message.sender || ''}\n${from}`;
  let kind = 'human_reply';
  if (/delivery status notification\s*\(failure\)|undeliverable|delivery failure|mail delivery failed|returned mail|address not found|user unknown/i.test(text)) {
    kind = 'bounce_permanent';
  } else if (/delivery status notification\s*\(delay\)|delivery delayed|delayed mail|temporarily deferred/i.test(text)) {
    kind = 'delay_temporary';
  } else if (/automatic reply|auto[ -]?reply|out of office|away from (?:the )?office|autoreply/i.test(text)) {
    kind = 'auto_reply';
  }

  let email = from;
  if (kind === 'bounce_permanent' || kind === 'delay_temporary') {
    const own = canonicalEmail(config.from_address);
    const excluded = new Set([own, from].filter(Boolean));
    const candidates = extractEmails(`${subject}\n${summary}`)
      .filter((candidate) => !excluded.has(candidate))
      .filter((candidate) => !/^(?:mailer-daemon|postmaster)@/i.test(candidate));
    email = candidates[0] || '';
  }

  const rawTime = Number(message.receivedTime || message.sentDateInGMT || 0);
  const receivedAt = Number.isFinite(rawTime) && rawTime > 0 ? new Date(rawTime).toISOString() : '';
  return {
    provider_event_id: String(message.messageId || message.message_id || ''),
    thread_id: String(message.threadId || message.thread_id || ''),
    kind,
    email,
    subject,
    body: summary,
    received_at: receivedAt
  };
}

class ZohoAdapter {
  constructor(config, options = {}) {
    this.config = config || {};
    this.fetchImpl = options.fetchImpl || global.fetch;
    if (typeof this.fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  async _getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 30000) return this.accessToken;
    const body = new URLSearchParams({
      refresh_token: this.config.refresh_token || '',
      client_id: this.config.client_id || '',
      client_secret: this.config.client_secret || '',
      grant_type: 'refresh_token'
    });
    const response = await this.fetchImpl(`${this.config.accounts_base_url}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    if (!response.ok) throw new Error(`Zoho OAuth refresh failed with HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.access_token) throw new Error('Zoho OAuth response did not include access_token');
    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + (Number(payload.expires_in || 3600) * 1000);
    return this.accessToken;
  }

  async _read(url) {
    const token = await this._getAccessToken();
    let lastResponse;
    for (let attempt = 1; attempt <= 3; attempt++) {
      lastResponse = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Zoho-oauthtoken ${token}` }
      });
      if (lastResponse.ok) return lastResponse;
      const transient = lastResponse.status === 429 || lastResponse.status >= 500;
      if (!transient || attempt === 3) break;
    }
    throw new Error(`Zoho read failed with HTTP ${lastResponse?.status || 'unknown'}`);
  }

  async listEvents(cursor = 0) {
    const start = Number.isFinite(Number(cursor)) ? Number(cursor) : 0;
    const url = `${this.config.mail_base_url}/api/accounts/${encodeURIComponent(this.config.account_id)}/messages/view?start=${start}&limit=200`;
    const response = await this._read(url);
    const payload = await response.json();
    const messages = Array.isArray(payload.data) ? payload.data : [];
    const events = messages.map((message) => normalizeZohoMessage(message, this.config));
    return { events, cursor: start + events.length };
  }

  async getMessage(id) {
    if (!id) throw new Error('message id is required');
    const url = `${this.config.mail_base_url}/api/accounts/${encodeURIComponent(this.config.account_id)}/messages/${encodeURIComponent(id)}/originalmessage`;
    const response = await this._read(url);
    return response.text();
  }

  async sendApprovedMessage(message, approval) {
    if (!this.config.live_send) throw new Error('Live send is not enabled; complete configuration and set OUTBOUND_OS_LIVE_SEND=1');
    if (!approvalMatches(message, approval)) throw new Error('Approval hash does not match the exact message');
    const token = await this._getAccessToken();
    const url = `${this.config.mail_base_url}/api/accounts/${encodeURIComponent(this.config.account_id)}/messages`;
    const payload = {
      fromAddress: this.config.from_address,
      toAddress: message.recipient,
      subject: message.subject,
      content: message.html || message.text || '',
      mailFormat: message.html ? 'html' : 'plaintext'
    };
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Zoho-oauthtoken ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      return { status: 'ambiguous', error: error.message, requires_reconciliation: true };
    }

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        return { status: 'ambiguous', http_status: response.status, requires_reconciliation: true };
      }
      return { status: 'failed', http_status: response.status, requires_reconciliation: false };
    }
    const body = await response.json();
    const messageId = body?.data?.messageId || body?.data?.message_id || body?.messageId || body?.message_id || null;
    return { status: 'sent', message_id: messageId, response: body };
  }

  async reconcileSent(result = {}) {
    if (!result.message_id) return { status: 'requires_reconciliation', confirmed: false };
    const message = await this.getMessage(result.message_id);
    return { status: 'confirmed', confirmed: true, message_id: result.message_id, message };
  }
}

module.exports = { ZohoAdapter, normalizeZohoMessage };
