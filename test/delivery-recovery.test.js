'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyMailboxEvent } = require('../src/reconcile');

function baseState() {
  return {
    contacts: {
      'buyer@acme.example': { email: 'buyer@acme.example', cold_eligible: true }
    },
    deals: {},
    processed_provider_event_ids: [],
    blocked_addresses: [],
    temporary_delays: []
  };
}

test('permanent bounce blocks exact address from future cold eligibility', () => {
  const { state } = applyMailboxEvent(baseState(), {
    provider_event_id: 'evt-bounce-1',
    type: 'bounce_permanent',
    email: 'buyer@acme.example'
  });

  assert.equal(state.contacts['buyer@acme.example'].cold_eligible, false);
  assert.equal(state.blocked_addresses['buyer@acme.example'].reason, 'permanent_bounce');
});

test('temporary delay does not become a permanent address block', () => {
  const { state } = applyMailboxEvent(baseState(), {
    provider_event_id: 'evt-delay-1',
    type: 'delay_temporary',
    email: 'buyer@acme.example'
  });

  assert.equal(state.contacts['buyer@acme.example'].cold_eligible, true);
  assert.equal(Object.keys(state.blocked_addresses).length, 0);
  assert.equal(state.temporary_delays.length, 1);
});
