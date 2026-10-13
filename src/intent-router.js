const { normalizeIntent } = require('./model');
const { routeSkill } = require('./skill-router');
const { applyMailboxEvent } = require('./reconcile');
const { validateDraft } = require('./preflight');
const { approvalMatches } = require('./approval');
const { evaluateSendGates } = require('./gates');
const { canonicalEmail } = require('./dedupe');

function resolveOrganizationKeyByEmail(state = {}, email) {
  const target = canonicalEmail(email);
  if (!target) return '';
  for (const [key, organization] of Object.entries(state.organizations || {})) {
    if (organization?.contacts?.[target]) return key;
  }
  return '';
}

async function runIntent(rawIntent, context = {}, deps = {}) {
  const intent = normalizeIntent(rawIntent);

  if (intent === 'start') {
    const skill = routeSkill(context);
    return {
      ok: true,
      intent,
      skill,
      next_action: skill === 'buyer-research' ? 'research_or_resolve_buyer' : skill,
      blockers: context.blockers || [],
      transport_called: false
    };
  }

  if (intent === 'check') {
    if (!deps.mailbox || typeof deps.mailbox.listEvents !== 'function') {
      return { ok: true, intent, state: context.state || {}, cursor: context.cursor || 0, changes: [], mode: 'no-mailbox' };
    }
    const batch = await deps.mailbox.listEvents(context.cursor || 0);
    let state = context.state || {};
    const changes = [];
    for (const event of batch.events || []) {
      const organizationKey = event.organization_key || resolveOrganizationKeyByEmail(state, event.email);
      if (!organizationKey) continue;
      const applied = applyMailboxEvent(state, { ...event, organization_key: organizationKey });
      state = applied.state;
      changes.push(...applied.emitted_events);
    }
    return { ok: true, intent, state, cursor: batch.cursor, changes };
  }

  const draft = context.draft || {};
  const preflight = validateDraft(draft, context.evidence_records || []);
  const matches = approvalMatches(draft, context.approval || {});
  const gateContext = {
    ...(context.gates || {}),
    requested_intent: 'send',
    personalization: { supported: preflight.ok },
    preflight,
    approval: { matches }
  };
  const gateResult = evaluateSendGates(gateContext);
  if (gateResult.decision !== 'PASS') {
    return { ok: false, intent, sent: false, decision: gateResult.decision, gates: gateResult.gates, preflight };
  }
  if (!deps.transport || typeof deps.transport.send !== 'function') {
    return { ok: false, intent, sent: false, decision: 'BLOCK', reason: 'No transport configured', gates: gateResult.gates, preflight };
  }
  const transportResult = await deps.transport.send(draft, context.approval);
  const status = String(transportResult?.status || 'unknown');
  const sent = status === 'sent';
  const simulated = status === 'simulated';
  const requiresReconciliation = status === 'ambiguous' || transportResult?.requires_reconciliation === true;
  const ok = sent || simulated;
  return {
    ok,
    intent,
    sent,
    simulated,
    executed: sent || simulated,
    decision: 'PASS',
    requires_reconciliation: requiresReconciliation,
    transport: transportResult,
    gates: gateResult.gates,
    preflight
  };
}

module.exports = { runIntent };
