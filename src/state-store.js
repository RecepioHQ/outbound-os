const fs = require('node:fs');
const path = require('node:path');

function emptyState() {
  return { organizations: {}, deals: {}, processed_event_ids: [], blocked_addresses: {} };
}

function projectEvents(events = []) {
  const state = emptyState();
  for (const event of events) {
    if (!event || !event.event_id || state.processed_event_ids.includes(event.event_id)) continue;
    state.processed_event_ids.push(event.event_id);
    if (event.type === 'organization_upsert') {
      const key = event.organization_key;
      state.organizations[key] = {
        ...(state.organizations[key] || { contacts: {}, cold_eligible: true }),
        key,
        name: event.name || state.organizations[key]?.name || '',
        domain: event.domain || state.organizations[key]?.domain || '',
        contacts: state.organizations[key]?.contacts || {}
      };
    } else if (event.type === 'contact_upsert') {
      const key = event.organization_key;
      state.organizations[key] ||= { key, contacts: {}, cold_eligible: true };
      state.organizations[key].contacts ||= {};
      state.organizations[key].contacts[String(event.email || '').toLowerCase()] = {
        ...(state.organizations[key].contacts[String(event.email || '').toLowerCase()] || {}),
        email: String(event.email || '').toLowerCase(),
        name: event.name || ''
      };
    } else if (event.type === 'deal_upsert' && event.deal_id) {
      state.deals[event.deal_id] = { ...state.deals[event.deal_id], ...event.deal };
    }
  }
  return state;
}

function writeStateAtomic(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function loadState(filePath) {
  if (!fs.existsSync(filePath)) return emptyState();
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { emptyState, projectEvents, writeStateAtomic, loadState };
