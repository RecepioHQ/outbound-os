const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildActionDeps, handleAction } = require('../src/action-api');
const { createRuntimeStateStore } = require('../src/runtime-state');

function seedState() {
  return {
    organizations: {
      'example.com': {
        key: 'example.com', name: 'Example Co', domain: 'example.com', cold_eligible: true,
        contacts: { 'owner@example.com': { email: 'owner@example.com' } }
      }
    },
    deals: {}, processed_event_ids: [], blocked_addresses: {}
  };
}

test('reconciled Deal Mode survives a new action dependency instance', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outbound-state-'));
  const store = createRuntimeStateStore(dataDir);
  store.save(seedState());

  const deps1 = buildActionDeps({}, {
    dataDir,
    mockEvents: [{
      provider_event_id: 'reply-persist-1', kind: 'human_reply', organization_key: 'example.com',
      email: 'owner@example.com', body: 'Interested', received_at: '2026-10-13T12:00:00Z'
    }]
  });
  const first = await handleAction({ action: 'check', input: { cursor: 0 } }, deps1);
  assert.equal(first.state.deals['deal:example.com'].stage, 'engaged');

  const deps2 = buildActionDeps({}, { dataDir, mockEvents: [] });
  const second = await handleAction({ action: 'check', input: { cursor: 0 } }, deps2);
  assert.equal(second.state.deals['deal:example.com'].stage, 'engaged');
  assert.equal(second.state.organizations['example.com'].cold_eligible, false);
});
