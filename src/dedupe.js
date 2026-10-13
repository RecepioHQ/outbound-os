function canonicalDomain(value) {
  return String(value || '').trim().toLowerCase().replace(/\.+$/, '');
}

function canonicalEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function canonicalName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function organizationKey(org = {}) {
  return canonicalDomain(org.domain) || canonicalName(org.name);
}

function findDuplicate(state = {}, candidate = {}) {
  const key = organizationKey(candidate.organization || candidate);
  const email = canonicalEmail(candidate.email || candidate.contact?.email);
  const organization = state.organizations?.[key];
  if (!organization) return { duplicate: false, kind: null, organization_key: key };
  if (email && organization.contacts?.[email]) {
    return { duplicate: true, kind: 'contact', organization_key: key, email };
  }
  return { duplicate: true, kind: 'organization', organization_key: key, email: email || null };
}

module.exports = { canonicalDomain, canonicalEmail, organizationKey, findDuplicate };
