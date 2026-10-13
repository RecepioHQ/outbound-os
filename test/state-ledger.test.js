const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { appendEvent, readEvents } = require('../src/ledger');
const { projectEvents, writeStateAtomic, loadState } = require('../src/state-store');

function temp(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outbound-os-'));
  return path.join(dir, name);
}

test('ledger appends in order and replayed event id is not duplicated', () => {
  const file = temp('events.jsonl');
  appendEvent(file, { event_id: 'evt-1', type: 'organization_upsert', organization_key: 'example.com', name: 'Example One' });
  appendEvent(file, { event_id: 'evt-2', type: 'contact_upsert', organization_key: 'example.com', email: 'owner@example.com' });
  appendEvent(file, { event_id: 'evt-1', type: 'organization_upsert', organization_key: 'example.com', name: 'Example One' });
  const events = readEvents(file);
  assert.deepEqual(events.map((e) => e.event_id), ['evt-1', 'evt-2']);
});

test('projectEvents deterministically builds organization and contact state', () => {
  const events = [
    { event_id: 'evt-1', type: 'organization_upsert', organization_key: 'example.com', name: 'Example One', domain: 'example.com' },
    { event_id: 'evt-2', type: 'contact_upsert', organization_key: 'example.com', email: 'owner@example.com', name: 'Owner' }
  ];
  assert.deepEqual(projectEvents(events), projectEvents(events));
  const state = projectEvents(events);
  assert.equal(state.organizations['example.com'].name, 'Example One');
  assert.equal(state.organizations['example.com'].contacts['owner@example.com'].name, 'Owner');
});

test('writeStateAtomic writes a loadable replacement without temp residue', () => {
  const file = temp('state.json');
  writeStateAtomic(file, { value: 1 });
  writeStateAtomic(file, { value: 2 });
  assert.deepEqual(loadState(file), { value: 2 });
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('malformed ledger line is rejected', () => {
  const file = temp('events.jsonl');
  fs.writeFileSync(file, '{"event_id":"ok"}\nnot-json\n', 'utf8');
  assert.throws(() => readEvents(file), /malformed ledger line/i);
});
