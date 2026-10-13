'use strict';

const { canonicalEmail } = require('./dedupe');
const { classifyMailboxEvent } = require('./reply-classifier');
const { upsertDeal } = require('./deal-state');

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function findNestedContact(state, email) {
  if (!email) return null;
  if (state.contacts?.[email]) return state.contacts[email];
  for (const organization of Object.values(state.organizations || {})) {
    if (organization?.contacts?.[email]) return organization.contacts[email];
  }
  return null;
}

function applyMailboxEvent(inputState = {}, event = {}) {
  const state = clone(inputState);
  state.organizations ||= {};
  state.contacts ||= {};
  state.deals ||= {};
  state.processed_event_ids ||= state.processed_provider_event_ids || [];
  state.blocked_addresses = Array.isArray(state.blocked_addresses)
    ? Object.fromEntries(state.blocked_addresses.map((email) => [email, { reason: 'blocked' }]))
    : (state.blocked_addresses || {});
  state.temporary_delays ||= [];

  const eventId = String(event.provider_event_id || event.event_id || '').trim();
  if (!eventId) throw new Error('Mailbox event requires provider_event_id or event_id');
  if (state.processed_event_ids.includes(eventId)) {
    return { state, emitted_events: [], replayed: true };
  }

  const kind = classifyMailboxEvent(event);
  const email = canonicalEmail(event.email);
  const contact = findNestedContact(state, email);
  const organizationKey = String(event.organization_key || contact?.organization_key || contact?.organization || '').trim();
  const organization = organizationKey ? state.organizations[organizationKey] : null;
  const emitted_events = [];

  if (kind === 'bounce_permanent') {
    if (email) state.blocked_addresses[email] = { reason: 'permanent_bounce', event_id: eventId };
    if (contact) {
      contact.delivery_status = 'bounced_permanent';
      contact.cold_eligible = false;
    }
    emitted_events.push({ type: 'address_blocked', email, reason: 'permanent_bounce', source_event_id: eventId });
  } else if (kind === 'delay_temporary') {
    if (contact) contact.delivery_status = 'delayed_temporary';
    if (!state.temporary_delays.some((item) => item.provider_event_id === eventId)) {
      state.temporary_delays.push({ provider_event_id: eventId, email });
    }
    emitted_events.push({ type: 'delivery_delayed', email, source_event_id: eventId });
  } else if (kind === 'delivery') {
    if (contact) contact.delivery_status = 'delivered';
    emitted_events.push({ type: 'delivered', email, source_event_id: eventId });
  } else if (kind === 'human_reply') {
    if (!organizationKey) throw new Error('Human reply requires organization_key or known contact organization');
    if (contact) contact.cold_eligible = false;
    if (organization) organization.cold_eligible = false;
    const deal = upsertDeal(state, { ...event, email, organization_key: organizationKey });
    emitted_events.push({ type: 'cold_to_deal', organization_key: organizationKey, deal_id: deal.deal_id, source_event_id: eventId });
  } else if (kind === 'auto_reply') {
    emitted_events.push({ type: 'auto_reply_observed', organization_key: organizationKey, email, source_event_id: eventId });
  } else {
    emitted_events.push({ type: 'unknown_mailbox_event', source_event_id: eventId });
  }

  state.processed_event_ids.push(eventId);
  return { state, emitted_events, replayed: false };
}

module.exports = { applyMailboxEvent };
