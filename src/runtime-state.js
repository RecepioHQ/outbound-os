const path = require('node:path');
const { loadState, writeStateAtomic } = require('./state-store');
const { appendEvent, readEvents } = require('./ledger');

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../state');

function createRuntimeStateStore(dataDir = DEFAULT_DATA_DIR) {
  const root = path.resolve(dataDir);
  const statePath = path.join(root, 'state.json');
  const ledgerPath = path.join(root, 'events.jsonl');
  return {
    root,
    statePath,
    ledgerPath,
    load() {
      return loadState(statePath);
    },
    save(state) {
      writeStateAtomic(statePath, state);
      return state;
    },
    record(event) {
      return appendEvent(ledgerPath, event);
    },
    events() {
      return readEvents(ledgerPath);
    }
  };
}

module.exports = { DEFAULT_DATA_DIR, createRuntimeStateStore };
