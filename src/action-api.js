const { runIntent } = require('./intent-router');
const { loadConfig } = require('./config');
const { DryRunTransport } = require('./adapters/dry-run-transport');
const { MockMailboxAdapter } = require('./adapters/mock-mailbox');
const { ZohoAdapter } = require('./adapters/zoho');
const { createRuntimeStateStore } = require('./runtime-state');

function buildActionDeps(env = process.env, options = {}) {
  const config = loadConfig(env);
  const stateStore = options.stateStore || createRuntimeStateStore(options.dataDir || env.OUTBOUND_OS_DATA_DIR);
  if (!config.live_send) {
    return {
      config,
      stateStore,
      transport: new DryRunTransport(),
      mailbox: options.mailbox || new MockMailboxAdapter(options.mockEvents || [])
    };
  }
  const zoho = new ZohoAdapter(config, { fetchImpl: options.fetchImpl });
  return {
    config,
    stateStore,
    mailbox: zoho,
    transport: {
      send: (message, approval) => zoho.sendApprovedMessage(message, approval)
    },
    zoho
  };
}

async function handleAction(request = {}, deps = {}) {
  const action = String(request.action || '').trim();
  const input = { ...(request.input || {}) };
  if (!Object.prototype.hasOwnProperty.call(input, 'state') && deps.stateStore?.load) {
    input.state = deps.stateStore.load();
  }

  const result = await runIntent(action, input, deps);

  if (result.state && deps.stateStore?.save) {
    deps.stateStore.save(result.state);
  }
  if (Array.isArray(result.changes) && deps.stateStore?.record) {
    for (const change of result.changes) {
      deps.stateStore.record({
        ...change,
        event_id: change.event_id || `${change.source_event_id || 'change'}:${change.type || 'event'}`
      });
    }
  }
  return result;
}

module.exports = { handleAction, buildActionDeps };
