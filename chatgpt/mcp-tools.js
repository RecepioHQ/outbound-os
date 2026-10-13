const { handleAction } = require('../src/action-api');

const TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'start',
    title: 'Start outbound work',
    description: 'Inspect current Outbound OS state and return the next justified task. This tool never sends mail or changes external state.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true }
  },
  {
    name: 'check',
    title: 'Check mailbox and state',
    description: 'Read the configured mailbox, reconcile events in the returned Outbound OS state, and report material changes. It does not send or modify mailbox data.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true }
  },
  {
    name: 'send',
    title: 'Attempt gated send',
    description: 'Attempt one approved outbound email through the configured provider. It cannot bypass verification, dedupe, preflight, deliverability, authorization, or approval-hash gates.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true, idempotentHint: false }
  }
]);

async function invokeTool(name, input = {}, deps = {}) {
  const tool = TOOL_DEFINITIONS.find((item) => item.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return handleAction({ action: name, input }, deps);
}

module.exports = { TOOL_DEFINITIONS, invokeTool };
