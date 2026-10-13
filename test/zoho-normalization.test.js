const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeZohoMessage } = require('../src/adapters/zoho');
const { runIntent } = require('../src/intent-router');

const config = { from_address: 'sender@example.com' };

test('normal Zoho inbound message normalizes to human_reply', () => {
  const event = normalizeZohoMessage({
    messageId: 'm-1', fromAddress: 'owner@customer.example', subject: 'Re: Hello', summary: 'Interested', receivedTime: '1791892800000'
  }, config);
  assert.equal(event.kind, 'human_reply');
  assert.equal(event.email, 'owner@customer.example');
  assert.equal(event.provider_event_id, 'm-1');
});

test('automatic reply is recognized conservatively', () => {
  const event = normalizeZohoMessage({
    messageId: 'm-2', fromAddress: 'owner@customer.example', subject: 'Automatic reply: Hello', summary: 'I am out of office'
  }, config);
  assert.equal(event.kind, 'auto_reply');
});

test('permanent delivery failure extracts failed external recipient', () => {
  const event = normalizeZohoMessage({
    messageId: 'm-3', fromAddress: 'mailer-daemon@example.net', subject: 'Delivery Status Notification (Failure)',
    summary: 'Your message to bad@customer.example could not be delivered. sender@example.com'
  }, config);
  assert.equal(event.kind, 'bounce_permanent');
  assert.equal(event.email, 'bad@customer.example');
});

test('temporary delivery delay extracts target and stays temporary', () => {
  const event = normalizeZohoMessage({
    messageId: 'm-4', fromAddress: 'mailer-daemon@example.net', subject: 'Delivery Status Notification (Delay)',
    summary: 'Delivery to slow@customer.example has been delayed. sender@example.com'
  }, config);
  assert.equal(event.kind, 'delay_temporary');
  assert.equal(event.email, 'slow@customer.example');
});

test('Check correlates a normalized sender email to known organization state', async () => {
  const state = {
    organizations: {
      'customer.example': {
        key: 'customer.example', name: 'Customer Example', domain: 'customer.example', cold_eligible: true,
        contacts: { 'owner@customer.example': { email: 'owner@customer.example' } }
      }
    },
    deals: {}, processed_event_ids: [], blocked_addresses: {}
  };
  const mailbox = {
    async listEvents() {
      return { events: [{ provider_event_id: 'm-5', kind: 'human_reply', email: 'owner@customer.example', body: 'Interested' }], cursor: 1 };
    }
  };
  const result = await runIntent('check', { state, cursor: 0 }, { mailbox });
  assert.equal(result.state.deals['deal:customer.example'].stage, 'engaged');
  assert.equal(result.state.organizations['customer.example'].cold_eligible, false);
});

test('Check ignores unmatched inbound messages instead of creating a deal', async () => {
  const state = { organizations: {}, deals: {}, processed_event_ids: [], blocked_addresses: {} };
  const mailbox = { async listEvents() { return { events: [{ provider_event_id: 'm-6', kind: 'human_reply', email: 'stranger@outside.example', body: 'Hello' }], cursor: 1 }; } };
  const result = await runIntent('check', { state, cursor: 0 }, { mailbox });
  assert.deepEqual(result.state.deals, {});
  assert.equal(result.changes.length, 0);
});
