'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyMailboxEvent } = require('../src/reconcile');

function state() {
  return {
    contacts: {
      'buyer@acme.example': {
        email: 'buyer@acme.example',
        organization_key: 'acme.example',
        cold_eligible: true
      }
    },
    deals: {},
    processed_provider_event_ids: [],
    blocked_addresses: [],
    temporary_delays: []
  };
}

test('replaying the same provider event id is idempotent', () => {
  const event = {
    provider_event_id: 'evt-human-1',
    type: 'human_reply',
    email: 'buyer@acme.example',
    organization_key: 'acme.example',
    text: 'Interested.'
  };

  const first = applyMailboxEvent(state(), event);
  const second = applyMailboxEvent(first.state, event);

  assert.equal(Object.keys(second.state.deals).length, 1);
  assert.equal(second.state.processed_event_ids.length, 1);
  assert.equal(second.emitted_events.length, 0);
  assert.equal(second.replayed, true);
});
