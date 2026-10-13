function validateDraft(draft = {}, evidence = []) {
  const reasons = [];
  if (!draft.recipient) reasons.push('Missing recipient');
  if (!draft.subject) reasons.push('Missing subject');
  if (!draft.text && !draft.html) reasons.push('Missing message body');

  const verifiedClaims = new Set((Array.isArray(evidence) ? evidence : [])
    .filter((item) => item && item.status === 'VERIFIED' && item.claim)
    .map((item) => String(item.claim).trim()));
  const claims = Array.isArray(draft.claims) ? draft.claims.map((claim) => String(claim).trim()).filter(Boolean) : [];
  const unsupported_claims = claims.filter((claim) => !verifiedClaims.has(claim));
  if (unsupported_claims.length) reasons.push('One or more personalization claims are unsupported');

  return { ok: reasons.length === 0, unsupported_claims, reasons };
}

module.exports = { validateDraft };
