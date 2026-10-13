'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyMailboxEvent } = require('../src/reconcile');
const { upsertDeal } = require('../src/deal-state');

function baseState() {
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

test('verified human reply removes contact from cold flow and creates engaged deal', () => {
  const { state, emitted_events } = applyMailboxEvent(baseState(), {
    provider_event_id: 'evt-reply-1',
    type: 'human_reply',
    email: 'buyer@acme.example',
    organization_key: 'acme.example',
    message_id: 'msg-example-1',
    text: 'Please send pricing.'
  });

  assert.equal(state.contacts['buyer@acme.example'].cold_eligible, false);
  assert.equal(state.deals['deal:acme.example'].stage, 'engaged');
  assert.equal(state.deals['deal:acme.example'].latest_human_reply.text, 'Please send pricing.');
  assert.ok(emitted_events.some((event) => event.type === 'cold_to_deal'));
});

test('upsertDeal does not advance stage just because a newer timestamp arrives', () => {
  const state = baseState();
  state.deals['deal:acme.example'] = {
    organization_key: 'acme.example',
    stage: 'pricing',
    contacts: ['buyer@acme.example']
  };

  const deal = upsertDeal(state, {
    email: 'buyer@acme.example',
    organization_key: 'acme.example',
    text: 'Thanks, I will review.',
    occurred_at: '2026-10-14T10:00:00Z'
  });

  assert.equal(deal.stage, 'pricing');
});
