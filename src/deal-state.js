'use strict';

function upsertDeal(state, humanReply = {}) {
  const organizationKey = String(humanReply.organization_key || '').trim();
  if (!organizationKey) throw new Error('Human reply requires organization_key');

  state.deals ||= {};
  const dealId = `deal:${organizationKey}`;
  const existing = state.deals[dealId] || {};
  const occurredAt = humanReply.occurred_at || humanReply.received_at || '';
  const text = humanReply.text || humanReply.body || '';

  const deal = {
    deal_id: dealId,
    organization_key: organizationKey,
    organization: existing.organization || organizationKey,
    contacts: Array.from(new Set([...(existing.contacts || []), humanReply.email].filter(Boolean))),
    latest_human_reply: {
      email: humanReply.email || '',
      text,
      body: text,
      message_id: humanReply.message_id || '',
      received_at: occurredAt
    },
    stage: existing.stage || 'engaged',
    verified_facts: existing.verified_facts || [],
    inferred_context: existing.inferred_context || [],
    unknowns: existing.unknowns || [],
    objections: existing.objections || [],
    pricing_context: existing.pricing_context || {},
    commitments: existing.commitments || [],
    next_justified_action: existing.next_justified_action || 'review_human_reply',
    last_thread_sync: occurredAt || existing.last_thread_sync || ''
  };

  state.deals[dealId] = deal;
  return deal;
}

module.exports = { upsertDeal };
